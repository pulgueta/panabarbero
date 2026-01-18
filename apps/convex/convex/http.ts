import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { twilio } from "./twilio";

const http = httpRouter();

twilio.registerRoutes(http);
authComponent.registerRoutes(http, createAuth, {
  cors: {
    // biome-ignore lint/style/noNonNullAssertion: will always exist
    allowedOrigins: [process.env.SITE_URL!],
  },
});

export default http;
