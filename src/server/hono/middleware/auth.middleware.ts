import { Context, Effect, Layer } from "effect";
import { createMiddleware } from "hono/factory";
import type { InferEffect } from "../../lib/effect/types";
import type { HonoContext } from "../app";

// Authentication is disabled — all requests are allowed through.
const LayerImpl = Effect.gen(function* () {
  const getAuthState = Effect.succeed({
    authEnabled: false,
    authPassword: undefined as string | undefined,
    validSessionToken: "",
  });

  const authRequiredMiddleware = createMiddleware<HonoContext>(
    async (_c, next) => {
      return next();
    },
  );

  return {
    getAuthState,
    authRequiredMiddleware,
  };
});

export type IAuthMiddleware = InferEffect<typeof LayerImpl>;
export class AuthMiddleware extends Context.Tag("AuthMiddleware")<
  AuthMiddleware,
  IAuthMiddleware
>() {
  static Live = Layer.effect(this, LayerImpl);
}
