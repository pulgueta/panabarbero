import { OpenAPIHono } from "@hono/zod-openapi";
import { API_HEADER } from "@panabarbero/constants";
import { logger } from "hono-pino";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import pino from "pino";
import pinoPretty from "pino-pretty";

import type { AppBindings } from "@/config/types";
import { env } from "@/env";
import { notFound } from "@/middlewares/app";
import { auth } from "@/config/auth";

export function createBackendRouter() {
  return new OpenAPIHono<AppBindings>();
}

export function createBackend() {
  const app = createBackendRouter();

  app.use(
    cors({
      origin: [env.APP_URL],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length", API_HEADER],
      credentials: true,
      maxAge: 600,
    })
  );
  app.use(prettyJSON());
  app.use(requestId());
  app.use(
    logger({
      pino: pino(
        {
          level: "debug",
        },
        pinoPretty()
      ),
    })
  );
  app.use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      c.set("user", null);
      c.set("session", null);

      return next();
    }

    c.set("user", session.user);
    c.set("session", session.session);

    return next();
  });
  app.notFound(notFound);

  return app;
}
