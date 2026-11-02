"use node";

import { OpenTelemetry } from "@ai-sdk/otel";
import { trace } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { PostHogTraceExporter } from "@posthog/ai/otel";
import { registerTelemetry, type TelemetryOptions } from "ai";

/**
 * PostHog AI observability via OpenTelemetry. Registered once at module scope;
 * AI SDK calls opt in per-call through {@link aiTelemetry}.
 *
 * AI SDK 7 no longer collects OpenTelemetry spans itself: `@ai-sdk/otel` has
 * to be registered once, and it reads the global tracer provider set below.
 */
const provider = new BasicTracerProvider({
  resource: resourceFromAttributes({
    "service.name": "panabarbero-convex",
  }),
  spanProcessors: [
    new SimpleSpanProcessor(
      new PostHogTraceExporter({
        // biome-ignore lint/style/noNonNullAssertion: declared required in convex.config.ts
        projectToken: process.env.POSTHOG_PROJECT_TOKEN!,
        host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      }),
    ),
  ],
});

trace.setGlobalTracerProvider(provider);
registerTelemetry(new OpenTelemetry());

/**
 * Builds the `telemetry` settings for an AI SDK call.
 *
 * AI SDK 7 removed `TelemetryOptions.metadata`, so the PostHog ids are
 * stamped on every span of the call by a per-call integration instead. The
 * keys match what SDK 6 metadata produced (`ai.telemetry.metadata.*`), plus
 * `posthog.distinct_id`, which the PostHog exporter reads first.
 */
export function aiTelemetry(opts: {
  spanName: string;
  distinctId?: string;
  traceId?: string;
  metadata?: Record<string, string | number | boolean>;
}): TelemetryOptions {
  const metadata: Record<string, string | number | boolean> = {
    ...(opts.distinctId ? { posthog_distinct_id: opts.distinctId } : {}),
    ...(opts.traceId ? { posthog_trace_id: opts.traceId } : {}),
    ...opts.metadata,
  };
  const attributes: Record<string, string | number | boolean> = {
    ...(opts.distinctId ? { "posthog.distinct_id": opts.distinctId } : {}),
  };

  for (const [key, value] of Object.entries(metadata)) {
    attributes[`ai.telemetry.metadata.${key}`] = value;
  }

  return {
    isEnabled: true,
    functionId: opts.spanName,
    // Per-call integrations replace the global one for this call only.
    integrations: new OpenTelemetry({ enrichSpan: () => attributes }),
  };
}
