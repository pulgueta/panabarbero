import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import cloudflareTunnel from "vite-plugin-cloudflare-tunnel";
import viteTsConfigPaths from "vite-tsconfig-paths";

const allowedHost = "local.panabarbero.com";

const config = defineConfig({
  plugins: [
    devtools(),
    nitro(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    cloudflareTunnel({
      hostname: allowedHost,
      apiToken: import.meta.env.CLOUDFLARE_API_TOKEN,
      accountId: import.meta.env.CLOUDFLARE_ACCOUNT_ID,
      cleanup: {
        autoCleanup: true,
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    allowedHosts: import.meta.env.DEV ? [allowedHost] : undefined,
  },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
});

export default config;
