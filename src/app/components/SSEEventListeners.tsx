import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import type { FC, PropsWithChildren } from "react";
import { useEffect, useRef } from "react";
import { projectDetailQuery, sessionDetailQuery } from "../../lib/api/queries";
import { streamingStateAtom } from "../../lib/atoms/streamingState";
import { useServerEventListener } from "../../lib/sse/hook/useServerEventListener";

export const SSEEventListeners: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();
  const setStreamingState = useSetAtom(streamingStateAtom);
  const sessionChangedTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  // Clean up pending sessionChanged timers on unmount
  useEffect(() => {
    const timers = sessionChangedTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  useServerEventListener("sessionListChanged", async (event) => {
    await queryClient.invalidateQueries({
      queryKey: projectDetailQuery(event.projectId).queryKey,
    });
  });

  useServerEventListener("sessionChanged", (event) => {
    const key = `${event.projectId}:${event.sessionId}`;
    const existing = sessionChangedTimers.current.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      sessionChangedTimers.current.delete(key);
      queryClient.invalidateQueries({
        queryKey: sessionDetailQuery(event.projectId, event.sessionId).queryKey,
      });
    }, 100);
    sessionChangedTimers.current.set(key, timer);
  });

  useServerEventListener("agentSessionChanged", async (event) => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return (
          Array.isArray(queryKey) &&
          queryKey[0] === "projects" &&
          queryKey[1] === event.projectId &&
          queryKey[2] === "agent-sessions" &&
          queryKey[3] === event.agentSessionId
        );
      },
    });
  });

  // Listen for virtual conversation updates - triggers before file watcher debounce
  // This reduces perceived latency by refreshing session data as soon as new assistant message is received
  useServerEventListener("virtualConversationUpdated", async (event) => {
    // Cancel any pending sessionChanged debounce for this session so the fast
    // refetchQueries below wins and the slower debounced invalidation is suppressed
    const debounceKey = `${event.projectId}:${event.sessionId}`;
    const existingTimer = sessionChangedTimers.current.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      sessionChangedTimers.current.delete(debounceKey);
    }

    // Clear streaming state for this session now that a full message has been committed
    setStreamingState((prev) => {
      const next = { ...prev };
      delete next[event.sessionId];
      return next;
    });

    await queryClient.refetchQueries({
      queryKey: sessionDetailQuery(event.projectId, event.sessionId).queryKey,
      type: "active",
    });
  });

  // streamingTokens — update accumulated text in atom
  useServerEventListener("streamingTokens", (event) => {
    setStreamingState((prev) => ({
      ...prev,
      [event.sessionId]: {
        ...prev[event.sessionId],
        accumulatedText: event.accumulatedText,
        activeToolProgress: prev[event.sessionId]?.activeToolProgress ?? {},
        statusMessage: prev[event.sessionId]?.statusMessage ?? null,
      },
    }));
  });

  // toolProgress — update tool progress entry
  useServerEventListener("toolProgress", (event) => {
    setStreamingState((prev) => ({
      ...prev,
      [event.sessionId]: {
        accumulatedText: prev[event.sessionId]?.accumulatedText ?? "",
        statusMessage: prev[event.sessionId]?.statusMessage ?? null,
        activeToolProgress: {
          ...(prev[event.sessionId]?.activeToolProgress ?? {}),
          [event.toolUseId]: {
            toolName: event.toolName,
            elapsedSeconds: event.elapsedTimeSeconds,
          },
        },
      },
    }));
  });

  // sessionStatusUpdated — update status message; null status clears it
  useServerEventListener("sessionStatusUpdated", (event) => {
    setStreamingState((prev) => ({
      ...prev,
      [event.sessionId]: {
        ...prev[event.sessionId],
        accumulatedText: prev[event.sessionId]?.accumulatedText ?? "",
        activeToolProgress: prev[event.sessionId]?.activeToolProgress ?? {},
        statusMessage:
          event.status === null ? null : (event.message ?? event.status),
      },
    }));
  });

  // sessionStreamingCleared — clear streaming state on any session end (normal, abort, or error)
  useServerEventListener("sessionStreamingCleared", (event) => {
    setStreamingState((prev) => {
      const next = { ...prev };
      delete next[event.sessionId];
      return next;
    });
  });

  return <>{children}</>;
};
