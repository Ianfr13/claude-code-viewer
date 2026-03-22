import type { PermissionRequest } from "../../../../types/permissions";
import type { PublicSessionProcess } from "../../../../types/session-process";
import type * as CCSessionProcess from "../../claude-code/models/CCSessionProcess";

export type InternalEventDeclaration = {
  // biome-ignore lint/complexity/noBannedTypes: correct type
  heartbeat: {};

  sessionListChanged: {
    projectId: string;
  };

  sessionChanged: {
    projectId: string;
    sessionId: string;
  };

  agentSessionChanged: {
    projectId: string;
    agentSessionId: string;
  };

  sessionProcessChanged: {
    processes: PublicSessionProcess[];
    changed: CCSessionProcess.CCSessionProcessState;
  };

  permissionRequested: {
    permissionRequest: PermissionRequest;
  };

  virtualConversationUpdated: {
    projectId: string;
    sessionId: string;
  };

  streamingTokens: {
    projectId: string;
    sessionId: string;
    deltaText: string;
    accumulatedText: string;
  };

  toolProgress: {
    projectId: string;
    sessionId: string;
    toolUseId: string;
    toolName: string;
    elapsedTimeSeconds: number;
  };

  sessionStatusUpdated: {
    projectId: string;
    sessionId: string;
    status: string | null;
    message?: string;
  };

  sessionStreamingCleared: {
    projectId: string;
    sessionId: string;
  };

  sessionLifecycleEvent: {
    projectId: string;
    sessionId: string;
    lifecycleKind: "hook_started" | "hook_progress" | "hook_response";
    payload: Record<string, unknown>;
  };
};
