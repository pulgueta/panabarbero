import { Hono } from "hono";

const app = new Hono();

const routes = app.get("/", (c) => {
  return c.json({
    message: "Hello Hono!",
  });
});

export type AppBackend = typeof routes;

export default app;
