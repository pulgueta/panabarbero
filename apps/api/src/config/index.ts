import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppBindings } from "@/config/types";
import { defaultHookHandler } from "@/middlewares/app";

export function createBackendRouter() {
  return new OpenAPIHono<AppBindings>({
    defaultHook: defaultHookHandler,
  });
}

export function createBackend() {
  const app = createBackendRouter();

  // app.use(
  //   cors({
  //     origin: ["*"],
  //     allowHeaders: ["Content-Type", "Authorization"],
  //     allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  //     exposeHeaders: ["Content-Length", API_HEADER, "X-Retry-After"],
  //     credentials: true,
  //     maxAge: 600,
  //   }),
  // );
  // app.use(prettyJSON());
  // app.use(requestId());

  // app.notFound(notFound);

  return app;
}
