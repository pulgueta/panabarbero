import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { polar } from "./polar";
import { twilio } from "./twilio";

const http = httpRouter();

twilio.registerRoutes(http);
authComponent.registerRoutes(http, createAuth, {
  cors: {
    // biome-ignore lint/style/noNonNullAssertion: will always exist
    allowedOrigins: [process.env.SITE_URL!],
  },
});
polar.registerRoutes(http);

export default http;
