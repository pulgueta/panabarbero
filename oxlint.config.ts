import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";
import vitest from "ultracite/oxlint/vitest";

const jsPlugins = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  extends: [
    antiSlop,
    core,
    jsPlugins,
    react,
    shadcn,
    tanstack,
    tanstackJsPlugins,
    vitest,
  ],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "convex/_generated/**/*",
    "src/routeTree.gen.ts",
    "src/components/ui/**/*",
    ".agents/**/*",
    ".claude/**/*",
    ".codex/**/*",
    ".cursor/**/*",
    "marketing/**/*",
    "panabarbero-gtm/**/*",
  ],
  jsPlugins: [
    ...(jsPlugins.jsPlugins ?? []),
    ...(shadcn.jsPlugins ?? []),
    "oxlint-plugin-complexity",
  ],
  options: {
    typeAware: true,
    typeCheck: true,
  },
  overrides: [
    {
      files: ["convex/**"],
      rules: {
        // Convex runs no React code.
        ...Object.fromEntries(
          Object.keys(react.rules ?? {}).map((rule) => [rule, "off"]),
        ),
        "unicorn/filename-case": ["error", { case: "camelCase" }],
      },
    },
  ],
  rules: {
    // Biome had `noNonNullAssertedOptionalChain` off.
    "typescript/no-non-null-asserted-optional-chain": "off",
  },
  settings: jsPluginSettings,
});
