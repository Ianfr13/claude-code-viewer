import { useAtomValue } from "jotai";
import type { FC } from "react";
import { streamingStateAtom } from "@/lib/atoms/streamingState";
import { ToolProgressBadge } from "./ToolProgressBadge";

type StreamingAssistantMessageProps = {
  sessionId: string;
};

export const StreamingAssistantMessage: FC<StreamingAssistantMessageProps> = ({
  sessionId,
}) => {
  const streamingState = useAtomValue(streamingStateAtom);
  const state = streamingState[sessionId];

  if (!state) {
    return null;
  }

  const hasText = state.accumulatedText.length > 0;
  const toolEntries = Object.entries(state.activeToolProgress);
  const hasTools = toolEntries.length > 0;
  const hasStatus = !!state.statusMessage; // guards against null AND empty string

  if (!hasText && !hasTools && !hasStatus) {
    return null;
  }

  return (
    <div className="w-full flex justify-start animate-in fade-in duration-300">
      <div className="w-full max-w-3xl lg:max-w-4xl sm:w-[90%] md:w-[85%] px-2">
        <div className="space-y-2">
          {hasText && (
            <div className="mx-1 sm:mx-2 my-2">
              <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">
                {state.accumulatedText}
                <span
                  className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-text-bottom"
                  style={{ animation: "blink 1s step-end infinite" }}
                />
              </p>
            </div>
          )}
          {hasTools && (
            <div className="flex flex-wrap gap-1.5 mx-1 sm:mx-2">
              {toolEntries.map(([toolUseId, entry]) => (
                <ToolProgressBadge
                  key={toolUseId}
                  toolName={entry.toolName}
                  elapsedSeconds={entry.elapsedSeconds}
                />
              ))}
            </div>
          )}
          {hasStatus && (
            <p className="text-xs text-muted-foreground mx-1 sm:mx-2 italic">
              {state.statusMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
