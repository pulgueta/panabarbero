import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "@/env";

const app = new Hono();

app.use(
  cors({
    origin: [env.APP_URL],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

const routes = app.get("/", (c) => {
  return c.json({
    message: "Hello Hono!",
  });
});

export type AppBackend = typeof routes;

export default app;
