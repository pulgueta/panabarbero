import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
  plugins: [
    devtools(),
    nitro(),
    tailwindcss(),
    tanstackStart({
      sitemap: {
        host: import.meta.env.PROD
          ? "https://panabarbero.com"
          : "http://localhost:3000",
      },
    }),
    viteReact(),
  ],
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
  resolve: {
    tsconfigPaths: true,
  },
});

export default config;
