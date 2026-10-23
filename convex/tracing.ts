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
        // oxlint-disable-next-line typescript/no-non-null-assertion -- declared required in convex.config.ts
        projectToken: process.env.POSTHOG_PROJECT_TOKEN!,
        host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      }),
    ),
  ],
});

trace.setGlobalTracerProvider(provider);

type AiTelemetryMetadata = Record<string, string | number | boolean>;

/** Builds the `experimental_telemetry` settings for an AI SDK call. */
export function aiTelemetry(opts: {
  spanName: string;
  distinctId?: string;
  traceId?: string;
  metadata?: AiTelemetryMetadata;
}) {
  const metadata: AiTelemetryMetadata = {};

  if (opts.distinctId) {
    metadata.posthog_distinct_id = opts.distinctId;
  }

  if (opts.traceId) {
    metadata.posthog_trace_id = opts.traceId;
  }

  return {
    isEnabled: true,
    functionId: opts.spanName,
    metadata: { ...metadata, ...opts.metadata },
  };
}
