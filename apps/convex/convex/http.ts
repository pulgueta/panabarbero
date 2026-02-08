import { authMiddleware } from "better-convex/auth";
import { HttpRouterWithHono } from "better-convex/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./lib/httpPolyfills";

import { createAuth } from "./auth";
import { polar } from "./polar";
import { twilio } from "./twilio";

const app = new Hono();
const siteUrl = process.env.SITE_URL ?? "";

app.use(
  "/api/*",
  cors({
    origin: siteUrl,
    allowHeaders: ["Content-Type", "Authorization", "Better-Auth-Cookie"],
    exposeHeaders: ["Set-Better-Auth-Cookie"],
    credentials: true,
  }),
);

app.use(authMiddleware(createAuth));

const http = new HttpRouterWithHono(app);

twilio.registerRoutes(http);
polar.registerRoutes(http);

export default http;
