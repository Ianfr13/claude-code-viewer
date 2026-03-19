import { Effect } from "effect";
import { Hono } from "hono";
import type { HonoContext } from "../app";

// Authentication is disabled — all endpoints are no-ops or return open access.
const authRoutes = Effect.gen(function* () {
  return new Hono<HonoContext>()
    .post("/login", async (c) => {
      return c.json({ success: true });
    })

    .post("/logout", async (c) => {
      return c.json({ success: true });
    })

    .get("/check", async (c) => {
      return c.json({ authenticated: true, authEnabled: false });
    });
});

export { authRoutes };
