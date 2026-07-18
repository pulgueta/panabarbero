import assert from "node:assert/strict";
import test from "node:test";

import { createServer } from "vite";

const mocks = new Map([
  [
    "./auth.config",
    "export const authkit = { registerRoutes() {} };",
  ],
  [
    "./notificationCopy",
    'export const siteUrl = () => "https://example.com";',
  ],
  ["./r2", 'export const r2 = { store: async () => "test-key" };'],
  ["./twilio", "export const twilio = { registerRoutes() {} };"],
  [
    "./usesend",
    "export const usesend = { handleUseSendEventWebhook: async () => new Response(null, { status: 200 }) };",
  ],
]);

test("registers the useSend webhook as a POST route", async (t) => {
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    plugins: [
      {
        name: "mock-http-route-dependencies",
        enforce: "pre",
        resolveId(source, importer) {
          if (importer?.endsWith("/convex/http.ts") && mocks.has(source)) {
            return `\0usesend-route-test:${source}`;
          }
        },
        load(id) {
          const prefix = "\0usesend-route-test:";
          if (id.startsWith(prefix)) {
            return mocks.get(id.slice(prefix.length));
          }
        },
      },
    ],
    server: { middlewareMode: true },
  });
  t.after(() => server.close());

  const { default: http } = await server.ssrLoadModule("/convex/http.ts");

  assert.ok(http.lookup("/usesend-webhook", "POST"));
  assert.equal(http.lookup("/usesend-webhook", "GET"), null);
});
