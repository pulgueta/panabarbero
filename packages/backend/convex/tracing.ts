"use node";

import { trace } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { PostHogTraceExporter } from "@posthog/ai/otel";

/**
 * PostHog AI observability via OpenTelemetry. Registered once at module scope;
 * AI SDK calls opt in per-call through {@link aiTelemetry}.
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

/** Builds the `experimental_telemetry` settings for an AI SDK call. */
export function aiTelemetry(opts: {
  spanName: string;
  distinctId?: string;
  traceId?: string;
  metadata?: Record<string, string | number | boolean>;
}) {
  return {
    isEnabled: true,
    functionId: opts.spanName,
    metadata: {
      ...(opts.distinctId ? { posthog_distinct_id: opts.distinctId } : {}),
      ...(opts.traceId ? { posthog_trace_id: opts.traceId } : {}),
      ...opts.metadata,
    },
  };
}
