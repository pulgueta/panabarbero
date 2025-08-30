import { OpenAPIHono } from "@hono/zod-openapi";
import { api } from "@panabarbero/constants";
import { logger } from "hono-pino";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import pino from "pino";
import pinoPretty from "pino-pretty";

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
      origin: [env.APP_URL],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length", api.API_HEADER],
      credentials: true,
      maxAge: 600,
    }),
  );
  app.use(prettyJSON());
  app.use(requestId());
  app.use(
    logger({
      pino: pino(
        {
          level: "debug",
        },
        pinoPretty(),
      ),
    }),
  );
  app.notFound(notFound);

  return app;
}
