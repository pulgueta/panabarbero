import { OpenAPIHono } from "@hono/zod-openapi";
import { API_HEADER } from "@panabarbero/constants/api";
import { cors } from "hono/cors";

import type { AppBindings } from "@/config/types";
import { env } from "@/env";
import { defaultHookHandler, notFound } from "@/middlewares/app";

export function createBackendRouter() {
  return new OpenAPIHono<AppBindings>({
    defaultHook: defaultHookHandler,
  });
}

export function createBackend() {
  const app = createBackendRouter();

  app.use(
    cors({
      origin: [env.APP_URL, "expo://"],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length", API_HEADER, "X-Retry-After"],
      credentials: true,
      maxAge: 600,
    }),
  );
  // app.use(prettyJSON());
  // app.use(requestId());

  app.notFound(notFound);

  return app;
}
