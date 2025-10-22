import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { twilio } from "./twilio";

const http = httpRouter();

twilio.registerRoutes(http);
authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: ["*"],
    allowedHeaders: ["*"],
  },
});

export default http;
