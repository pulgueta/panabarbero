/** biome-ignore-all lint/style/noNonNullAssertion: SITE_URL is set in the environment variables */
import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { resend } from "./emails";
import { errorMessages } from "./errors";
import {
  CREDIT_KEY_TO_TYPE,
  CREDIT_PRODUCT_KEYS,
  CREDITS_PER_PURCHASE,
  type CreditProductKey,
} from "./plans";
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

polar.registerRoutes(http, {
  events: {
    "order.paid": async (ctx, event) => {
      const order = event.data;

      console.log("order", order);

      if (!order.paid || !order.productId) {
        return;
      }

      console.log("polar.products", JSON.stringify(polar.products));
      console.log("order.productId", order.productId);

      const productIdToKey = Object.fromEntries(
        CREDIT_PRODUCT_KEYS.map((key) => [polar.products[key], key]),
      ) as Record<string, CreditProductKey>;

      console.log("productIdToKey", JSON.stringify(productIdToKey));

      const creditKey = productIdToKey[order.productId];

      console.log("creditKey", creditKey);

      if (!creditKey) {
        return;
      }

      // The barbershopId is passed through checkout metadata since we can't
      // reverse-lookup the customer's userId from the Polar customer ID.
      const barbershopId = order.metadata?.barbershopId as string | undefined;

      console.log("barbershopId", barbershopId);

      if (!barbershopId) {
        console.error(
          "[credits] order.created missing barbershopId in metadata",
          order.id,
        );
        return;
      }

      const type = CREDIT_KEY_TO_TYPE[creditKey];
      const amount = CREDITS_PER_PURCHASE[creditKey];

      await ctx.runMutation(internal.credits.addPurchasedCredits, {
        orderId: order.id,
        barbershopId,
        type,
        amount,
      });
    },
  },
});

export default http;
