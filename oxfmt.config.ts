import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// Keep the Biome style and scope. Biome formatted `convex/**/*.ts`,
// `src/**/*.{ts,tsx}`, `vite.config.ts`, and every CSS and JSON file.
export default defineConfig({
  ...ultracite,
  trailingComma: "all",
  // The Biome import order puts `convex/server` before `convex-helpers`;
  // oxfmt puts `-` before `/`, which reorders imports in about 50 files.
  sortImports: false,
  // The Tailwind class order of oxfmt is different from Biome
  // `useSortedClasses` and touches about 170 files.
  sortTailwindcss: false,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "*.md",
    "*.mdx",
    "*.yaml",
    "*.yml",
    "*.js",
    "*.mjs",
    "*.html",
    "/.agents/",
    "/.atl/",
    "/.claude/",
    "/.codex/",
    "/.cursor/",
    "/.github/",
    "/.impeccable/",
    "/.plans/",
    "/.tanstack/",
    "/docs/",
    "/emails/**/*.ts",
    "/emails/**/*.tsx",
    "/marketing/",
    "/odd/",
    "/panabarbero-gtm/",
    "/patches/",
    "/tests/",
    "/doctor.config.ts",
    "/vitest.config.ts",
    "/src/routeTree.gen.ts",
  ],
});
