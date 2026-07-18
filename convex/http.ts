/** biome-ignore-all lint/style/noNonNullAssertion: SITE_URL is set in the environment variables */
import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authkit } from "./auth.config";
import { errorMessages } from "./errors";
import { siteUrl } from "./notificationCopy";
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

http.route({
  path: "/usesend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await usesend.handleUseSendEventWebhook(ctx, request);
  }),
});

/**
 * MercadoPago webhook (subscriptions + one-time credit payments). Signature
 * verification + resource fetch happen in a
 * `"use node"` action; this route only forwards the values it needs and maps the
 * returned HTTP status back to MercadoPago.
 */
http.route({
  path: "/mercadopago/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);

    // Signed webhooks carry `data.id` in the query string — that is the value
    // MercadoPago hashed, so prefer it for signature validation.
    const queryDataId =
      url.searchParams.get("data.id") ??
      url.searchParams.get("id") ??
      undefined;

    let bodyType: string | undefined;
    let bodyDataId: string | undefined;
    let bodyPaymentId: string | undefined;
    try {
      const body = (await request.json()) as {
        type?: string;
        topic?: string;
        data?: { id?: string | number; payment_id?: string | number };
      };
      bodyType = body.type ?? body.topic;
      bodyDataId =
        body.data?.id !== undefined ? String(body.data.id) : undefined;
      bodyPaymentId =
        body.data?.payment_id !== undefined
          ? String(body.data.payment_id)
          : undefined;
    } catch {
      // IPN pings may have no JSON body — fall back to query params.
    }

    const status = await ctx.runAction(
      internal.mercadopagoWebhooks.processWebhookEvent,
      {
        xSignature: request.headers.get("x-signature") ?? undefined,
        xRequestId: request.headers.get("x-request-id") ?? undefined,
        dataId: queryDataId ?? bodyDataId,
        paymentId: bodyPaymentId,
        type:
          bodyType ??
          url.searchParams.get("type") ??
          url.searchParams.get("topic") ??
          undefined,
      },
    );

    return new Response(null, { status });
  }),
});

export default http;
