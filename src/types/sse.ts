import type { PermissionRequest } from "./permissions";
import type { PublicSessionProcess } from "./session-process";

export type SSEEventDeclaration = {
  // biome-ignore lint/complexity/noBannedTypes: correct type
  connect: {};

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
  };

  permissionRequested: {
    permissionRequest: PermissionRequest;
  };

  virtualConversationUpdated: {
    projectId: string;
    sessionId: string;
  };

  // Streaming text delta from assistant (token by token)
  streamingTokens: {
    projectId: string;
    sessionId: string;
    deltaText: string;
    accumulatedText: string;
  };

  // Periodic progress while a tool is executing
  toolProgress: {
    projectId: string;
    sessionId: string;
    toolUseId: string;
    toolName: string;
    elapsedTimeSeconds: number;
  };

  // Status update (e.g. compacting); status: null means "status cleared"
  sessionStatusUpdated: {
    projectId: string;
    sessionId: string;
    status: string | null;
    message?: string;
  };

  // Signals that streaming state should be cleared (session aborted or errored)
  sessionStreamingCleared: {
    projectId: string;
    sessionId: string;
  };

  // General lifecycle event (hooks, tasks)
  sessionLifecycleEvent: {
    projectId: string;
    sessionId: string;
    lifecycleKind:
      | "hook_started"
      | "hook_progress"
      | "hook_response"
      | "task_progress";
    payload: Record<string, unknown>;
  };
};

export type SSEEventMap = {
  [K in keyof SSEEventDeclaration]: SSEEventDeclaration[K] & {
    kind: K;
    timestamp: string;
  };
};

export type SSEEvent = SSEEventMap[keyof SSEEventDeclaration];
