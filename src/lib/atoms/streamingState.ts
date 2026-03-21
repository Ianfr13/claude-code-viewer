import { atom } from "jotai";

export type ToolProgressEntry = {
  toolName: string;
  elapsedSeconds: number;
};

export type SessionStreamingState = {
  accumulatedText: string;
  activeToolProgress: Record<string, ToolProgressEntry>; // keyed by toolUseId
  statusMessage: string | null;
};

export const streamingStateAtom = atom<Record<string, SessionStreamingState>>(
  {},
); // keyed by sessionId
