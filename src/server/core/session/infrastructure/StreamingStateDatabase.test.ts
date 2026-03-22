import { Effect } from "effect";
import { StreamingStateDatabase } from "./StreamingStateDatabase";

describe("StreamingStateDatabase", () => {
  describe("appendPartialText", () => {
    it("accumulates text correctly across multiple calls", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        const after1 = yield* db.appendPartialText("session-1", "Hello");
        const after2 = yield* db.appendPartialText("session-1", ", ");
        const after3 = yield* db.appendPartialText("session-1", "world");

        return { after1, after2, after3 };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(result.after1).toBe("Hello");
      expect(result.after2).toBe("Hello, ");
      expect(result.after3).toBe("Hello, world");
    });

    it("starts with empty string for a new session", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;
        const result = yield* db.appendPartialText("session-new", "first");
        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(result).toBe("first");
    });
  });

  describe("clearSession", () => {
    it("removes all state for a session", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        yield* db.appendPartialText("session-1", "some text");
        yield* db.upsertToolProgress("session-1", "tool-1", "Bash", 1.5);

        yield* db.clearSession("session-1");

        const state = yield* db.getSessionState("session-1");
        return state;
      });

      const state = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(state).toBeNull();
    });

    it("clearing a non-existent session does not cause an error", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;
        yield* db.clearSession("non-existent");
      });

      await expect(
        Effect.runPromise(
          program.pipe(Effect.provide(StreamingStateDatabase.Live)),
        ),
      ).resolves.not.toThrow();
    });

    it("after clearSession, appendPartialText starts fresh", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        yield* db.appendPartialText("session-1", "old text");
        yield* db.clearSession("session-1");
        const accumulated = yield* db.appendPartialText("session-1", "new");

        return accumulated;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(result).toBe("new");
    });
  });

  describe("multiple sessions are independent", () => {
    it("one session's state does not affect another", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        yield* db.appendPartialText("session-a", "text for A");
        yield* db.appendPartialText("session-b", "text for B");

        const stateA = yield* db.getSessionState("session-a");
        const stateB = yield* db.getSessionState("session-b");

        return { stateA, stateB };
      });

      const { stateA, stateB } = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(stateA?.accumulatedText).toBe("text for A");
      expect(stateB?.accumulatedText).toBe("text for B");
    });

    it("clearing one session does not affect others", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        yield* db.appendPartialText("session-a", "text for A");
        yield* db.appendPartialText("session-b", "text for B");

        yield* db.clearSession("session-a");

        const stateA = yield* db.getSessionState("session-a");
        const stateB = yield* db.getSessionState("session-b");

        return { stateA, stateB };
      });

      const { stateA, stateB } = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(stateA).toBeNull();
      expect(stateB?.accumulatedText).toBe("text for B");
    });
  });

  describe("upsertToolProgress", () => {
    it("stores tool progress correctly", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        yield* db.upsertToolProgress("session-1", "tool-use-1", "Bash", 2.5);

        const state = yield* db.getSessionState("session-1");
        return state;
      });

      const state = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(state?.activeToolProgress.get("tool-use-1")).toEqual({
        toolName: "Bash",
        elapsedTimeSeconds: 2.5,
      });
    });

    it("updates existing tool progress entry", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        yield* db.upsertToolProgress("session-1", "tool-use-1", "Bash", 1.0);
        yield* db.upsertToolProgress("session-1", "tool-use-1", "Bash", 3.0);

        const state = yield* db.getSessionState("session-1");
        return state;
      });

      const state = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(state?.activeToolProgress.get("tool-use-1")).toEqual({
        toolName: "Bash",
        elapsedTimeSeconds: 3.0,
      });
      expect(state?.activeToolProgress.size).toBe(1);
    });
  });

  describe("clearToolProgress", () => {
    it("removes a specific tool entry without affecting others", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        yield* db.upsertToolProgress("session-1", "tool-use-1", "Bash", 1.0);
        yield* db.upsertToolProgress("session-1", "tool-use-2", "Read", 0.5);

        yield* db.clearToolProgress("session-1", "tool-use-1");

        const state = yield* db.getSessionState("session-1");
        return state;
      });

      const state = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(state?.activeToolProgress.has("tool-use-1")).toBe(false);
      expect(state?.activeToolProgress.get("tool-use-2")).toEqual({
        toolName: "Read",
        elapsedTimeSeconds: 0.5,
      });
    });

    it("clearing a non-existent tool entry does not cause an error", async () => {
      const program = Effect.gen(function* () {
        const db = yield* StreamingStateDatabase;

        yield* db.upsertToolProgress("session-1", "tool-use-1", "Bash", 1.0);
        yield* db.clearToolProgress("session-1", "non-existent-tool");

        const state = yield* db.getSessionState("session-1");
        return state;
      });

      const state = await Effect.runPromise(
        program.pipe(Effect.provide(StreamingStateDatabase.Live)),
      );

      expect(state?.activeToolProgress.size).toBe(1);
    });
  });
});
