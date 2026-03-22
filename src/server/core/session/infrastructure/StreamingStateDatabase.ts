import { Context, Effect, Layer, Ref } from "effect";

type SessionStreamingState = {
  accumulatedText: string;
  activeToolProgress: Map<
    string,
    { toolName: string; elapsedTimeSeconds: number }
  >;
};

/**
 * Holds ephemeral streaming state in memory for active sessions.
 * State is not persisted and is cleared when sessions complete.
 */
export class StreamingStateDatabase extends Context.Tag(
  "StreamingStateDatabase",
)<
  StreamingStateDatabase,
  {
    readonly appendPartialText: (
      sessionId: string,
      delta: string,
    ) => Effect.Effect<string>;
    readonly clearPartialText: (sessionId: string) => Effect.Effect<void>;
    readonly clearSession: (sessionId: string) => Effect.Effect<void>;
    readonly upsertToolProgress: (
      sessionId: string,
      toolUseId: string,
      toolName: string,
      elapsedTimeSeconds: number,
    ) => Effect.Effect<void>;
    readonly clearToolProgress: (
      sessionId: string,
      toolUseId: string,
    ) => Effect.Effect<void>;
    readonly getSessionState: (
      sessionId: string,
    ) => Effect.Effect<SessionStreamingState | null>;
  }
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const storageRef = yield* Ref.make(
        new Map<string, SessionStreamingState>(),
      );

      const getOrCreateState = (
        sessionId: string,
        storage: Map<string, SessionStreamingState>,
      ): SessionStreamingState => {
        const existing = storage.get(sessionId);
        if (existing !== undefined) {
          return existing;
        }
        const newState: SessionStreamingState = {
          accumulatedText: "",
          activeToolProgress: new Map(),
        };
        storage.set(sessionId, newState);
        return newState;
      };

      const appendPartialText = (sessionId: string, delta: string) =>
        Ref.modify(storageRef, (storage) => {
          const newStorage = new Map(storage);
          const state = getOrCreateState(sessionId, newStorage);
          const updatedState: SessionStreamingState = {
            ...state,
            accumulatedText: state.accumulatedText + delta,
          };
          newStorage.set(sessionId, updatedState);
          return [updatedState.accumulatedText, newStorage];
        });

      const clearPartialText = (sessionId: string) =>
        Ref.update(storageRef, (storage) => {
          const newStorage = new Map(storage);
          const existing = newStorage.get(sessionId);
          if (existing !== undefined) {
            newStorage.set(sessionId, {
              ...existing,
              accumulatedText: "",
            });
          }
          return newStorage;
        });

      const clearSession = (sessionId: string) =>
        Ref.update(storageRef, (storage) => {
          const newStorage = new Map(storage);
          newStorage.delete(sessionId);
          return newStorage;
        });

      const upsertToolProgress = (
        sessionId: string,
        toolUseId: string,
        toolName: string,
        elapsedTimeSeconds: number,
      ) =>
        Ref.update(storageRef, (storage) => {
          const newStorage = new Map(storage);
          const state = getOrCreateState(sessionId, newStorage);
          const newToolProgress = new Map(state.activeToolProgress);
          newToolProgress.set(toolUseId, { toolName, elapsedTimeSeconds });
          newStorage.set(sessionId, {
            ...state,
            activeToolProgress: newToolProgress,
          });
          return newStorage;
        });

      const clearToolProgress = (sessionId: string, toolUseId: string) =>
        Ref.update(storageRef, (storage) => {
          const newStorage = new Map(storage);
          const existing = newStorage.get(sessionId);
          if (existing !== undefined) {
            const newToolProgress = new Map(existing.activeToolProgress);
            newToolProgress.delete(toolUseId);
            newStorage.set(sessionId, {
              ...existing,
              activeToolProgress: newToolProgress,
            });
          }
          return newStorage;
        });

      const getSessionState = (sessionId: string) =>
        Effect.gen(function* () {
          const storage = yield* Ref.get(storageRef);
          return storage.get(sessionId) ?? null;
        });

      return {
        appendPartialText,
        clearPartialText,
        clearSession,
        upsertToolProgress,
        clearToolProgress,
        getSessionState,
      };
    }),
  );
}

export type IStreamingStateDatabase = Context.Tag.Service<
  typeof StreamingStateDatabase
>;
