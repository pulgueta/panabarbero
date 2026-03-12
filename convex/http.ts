import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { resend } from "./emails";
import { polar } from "./polar";
import { twilio } from "./twilio";

const http = httpRouter();

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

twilio.registerRoutes(http);
authComponent.registerRoutes(http, createAuth);
polar.registerRoutes(http);

export default http;
