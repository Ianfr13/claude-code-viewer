import { Effect } from "effect";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { HonoContext } from "../app";
import { AuthMiddleware } from "./auth.middleware";

// Authentication is disabled — all requests pass through regardless of headers.
const createTestApp = () =>
  Effect.gen(function* () {
    const authState = yield* AuthMiddleware;
    const app = new Hono<HonoContext>();

    app.get("/api/auth/check", (c) => c.json({ ok: true }));
    app.use(authState.authRequiredMiddleware);
    app.get("/api/projects", (c) => c.json({ ok: true }));

    return { app };
  });

describe("auth required middleware", () => {
  it("allows all API access (auth disabled)", async () => {
    const { app } = await Effect.runPromise(
      createTestApp().pipe(Effect.provide(AuthMiddleware.Live)),
    );

    const response = await app.request("/api/projects");
    expect(response.status).toBe(200);
  });

  it("allows access without any credentials", async () => {
    const { app } = await Effect.runPromise(
      createTestApp().pipe(Effect.provide(AuthMiddleware.Live)),
    );

    const response = await app.request("/api/projects", {
      headers: {},
    });
    expect(response.status).toBe(200);
  });

  it("allows access to public routes", async () => {
    const { app } = await Effect.runPromise(
      createTestApp().pipe(Effect.provide(AuthMiddleware.Live)),
    );

    const response = await app.request("/api/auth/check");
    expect(response.status).toBe(200);
  });

  it("getAuthState returns authEnabled: false", async () => {
    const { authEnabled } = await Effect.runPromise(
      Effect.gen(function* () {
        const authState = yield* AuthMiddleware;
        return yield* authState.getAuthState;
      }).pipe(Effect.provide(AuthMiddleware.Live)),
    );

    expect(authEnabled).toBe(false);
  });
});
