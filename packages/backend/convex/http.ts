/** biome-ignore-all lint/style/noNonNullAssertion: SITE_URL is set in the environment variables */
import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authkit } from "./auth.config";
import { errorMessages } from "./errors";
import { siteUrl } from "./notificationCopy";
import {
  CREDIT_KEY_TO_TYPE,
  CREDIT_PRODUCT_KEYS,
  CREDITS_PER_PURCHASE,
} from "./plans";
import { polar } from "./polar";
import { r2 } from "./r2";
import { twilio } from "./twilio";
import { usesend } from "./usesend";

const http = httpRouter();

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
          "Access-Control-Allow-Origin": siteUrl(),
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
      "Access-Control-Allow-Origin": siteUrl(),
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

      case "inventory-item": {
        const key = await r2.store(ctx, blob, {
          key: `assets/inventory/${crypto.randomUUID()}`,
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
authkit.registerRoutes(http);
usesend.registerRoutes(http);

/** Polar product id → credit product key, for the paid products that grant credits. */
const CREDIT_PRODUCT_ID_TO_KEY = new Map(
  CREDIT_PRODUCT_KEYS.flatMap((key) => {
    const productId = polar.products[key];
    return productId ? [[productId, key] as const] : [];
  }),
);

/** Every product id configured in the environment (plans + credits). */
const CONFIGURED_PRODUCT_IDS = new Set(
  Object.values(polar.products).filter(Boolean),
);

// Polar webhook — keeps the component's synced subscription/product state
// current and grants one-time credit purchases on paid orders.
polar.registerRoutes(http, {
  events: {
    "order.paid": async (ctx, event) => {
      const order = event.data;

      if (!order.paid || !order.productId) {
        return;
      }

      const creditKey = CREDIT_PRODUCT_ID_TO_KEY.get(order.productId);

      // Subscription-cycle orders fall through here. A paid order for a
      // product outside the configured catalog means the credit product env
      // vars are missing or stale — surface it, the customer paid.
      if (!creditKey) {
        if (!CONFIGURED_PRODUCT_IDS.has(order.productId)) {
          console.error(
            `[polar] orden pagada ${order.id}: producto ${order.productId} no configurado — créditos no acreditados`,
          );
        }
        return;
      }

      // Set server-side by `generateCheckoutLink` — never client-supplied.
      const userId = order.metadata?.userId;

      if (typeof userId !== "string") {
        console.error(
          `[polar] orden pagada ${order.id} sin userId en metadata — créditos no acreditados`,
        );
        return;
      }

      await ctx.runMutation(internal.credits.addPurchasedCredits, {
        orderId: order.id,
        userId,
        type: CREDIT_KEY_TO_TYPE[creditKey],
        amount: CREDITS_PER_PURCHASE[creditKey],
      });
    },
  },
});

export default http;
