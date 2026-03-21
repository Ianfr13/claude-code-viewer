import { useSuspenseQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { sessionDetailQuery } from "../../../../../../lib/api/queries";
import { sessionProcessesAtom } from "../store/sessionProcessesAtom";

export const useSessionQuery = (projectId: string, sessionId: string) => {
  const processes = useAtomValue(sessionProcessesAtom);
  const isRunning = processes.some(
    (p) => p.sessionId === sessionId && p.status === "running",
  );

  return useSuspenseQuery({
    queryKey: sessionDetailQuery(projectId, sessionId).queryKey,
    queryFn: sessionDetailQuery(projectId, sessionId).queryFn,
    // Fallback polling in case SSE connection is lost
    // This ensures users don't need to manually refresh the page
    // Disable polling while the session process is actively running to prevent
    // stale polling responses from overwriting SSE-driven updates
    refetchInterval: isRunning ? false : 3000,
    refetchIntervalInBackground: false,
  });
};
