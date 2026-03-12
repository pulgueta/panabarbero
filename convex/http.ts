/** biome-ignore-all lint/style/noNonNullAssertion: SITE_URL is set in the environment variables */
import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";

import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { resend } from "./emails";
import { errorMessages } from "./errors";
import { polar } from "./polar";
import { r2 } from "./r2";
import { twilio } from "./twilio";

const http = httpRouter();

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

http.route({
  path: "/upload",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const headers = request.headers;

    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.SITE_URL!,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Digest",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});
http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const type = new URL(req.url).searchParams.get("type");

    if (!type) {
      return new Response(null, {
        status: 400,
      });
    }

    const blob = await req.blob();

    const headers = new Headers({
      "Access-Control-Allow-Origin": process.env.SITE_URL!,
      Vary: "origin",
    });

    switch (type) {
      case "barbershop-logo": {
        const key = await r2.store(ctx, blob, {
          key: `assets/logos/${crypto.randomUUID()}`,
        });

        return new Response(JSON.stringify(key), {
          status: 200,
          headers,
        });
      }

      case "profile-photo": {
        const key = await r2.store(ctx, blob, {
          key: `assets/profile-photos/${crypto.randomUUID()}`,
        });

        return new Response(JSON.stringify(key), {
          status: 200,
          headers,
        });
      }

      default:
        throw new ConvexError(errorMessages.notFound("archivo"));
    }
  }),
});

twilio.registerRoutes(http);
authComponent.registerRoutes(http, createAuth);
polar.registerRoutes(http);

export default http;
