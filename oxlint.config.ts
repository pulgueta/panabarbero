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
        // doctor.config.ts ignores convex/** for React Doctor too.
        ...Object.fromEntries(
          Object.keys(jsPlugins.rules ?? {})
            .filter((rule) => rule.startsWith("react-doctor/"))
            .map((rule) => [rule, "off"]),
        ),
        "unicorn/filename-case": ["error", { case: "camelCase" }],
      },
    },
    // Per-file React Doctor exceptions mirrored from doctor.config.ts.
    {
      files: [
        "src/components/analytics/appointments-trend-chart.tsx",
        "src/components/analytics/revenue-trend-chart.tsx",
        "src/components/analytics/top-breakdown-chart.tsx",
        "src/components/analytics/weekday-chart.tsx",
        "src/components/inventory/category-breakdown-chart.tsx",
        "src/components/inventory/movement-trend-chart.tsx",
        "src/components/inventory/sales/sales-revenue-chart.tsx",
        "src/components/inventory/sales/top-products-chart.tsx",
        "src/components/reviews/shop/rating-trend.tsx",
      ],
      rules: {
        // The route is already code-split; a dynamic import adds a flicker.
        "react-doctor/prefer-dynamic-import": "off",
      },
    },
    {
      files: ["src/routes/barbershops/index.tsx"],
      rules: {
        // The second await needs the first result.
        "react-doctor/tanstack-start-loader-parallel-fetch": "off",
      },
    },
    {
      files: ["src/components/markdown.tsx"],
      rules: {
        // Renders trusted markdown from local .md files.
        "react/no-danger": "off",
        "react-doctor/no-danger": "off",
      },
    },
  ],
  rules: {
    // Biome had `noNonNullAssertedOptionalChain` off.
    "typescript/no-non-null-asserted-optional-chain": "off",

    // Style rules that fight the house style (see odd/tasks/oxc-migration.md T4).
    "anti-slop/require-readable-spacing": "off",
    "eslint/arrow-body-style": "off",
    "eslint/curly": "off",
    "eslint/func-style": "off",
    "eslint/no-negated-condition": "off",
    "eslint/no-nested-ternary": "off",
    "eslint/prefer-destructuring": "off",
    "eslint/require-unicode-regexp": "off",
    "react/function-component-definition": "off",
    "typescript/array-type": "off",
    "typescript/consistent-type-definitions": "off",
    "typescript/method-signature-style": "off",
    "unicorn/no-negated-condition": "off",
    "unicorn/numeric-separators-style": "off",
    "unicorn/switch-case-braces": "off",

    // Type-aware rules that flag idiomatic code in this codebase.
    "typescript/no-confusing-void-expression": "off",
    "typescript/promise-function-async": "off",
    "typescript/strict-boolean-expressions": "off",
    "typescript/strict-void-return": "off",

    // More pure-style rules (counts in odd/tasks/oxc-migration.md T4).
    "eslint/no-inline-comments": "off",
    "eslint/no-plusplus": "off",
    "eslint/prefer-named-capture-group": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/prefer-ternary": "off",

    // Convex queries are reactive subscriptions: a mutation needs no cache
    // invalidation.
    "react-doctor/query-mutation-missing-invalidation": "off",

    // Sequential awaits are deliberate in Convex mutations.
    "eslint/no-await-in-loop": "off",

    // Follow-up: shadcn design rules (see odd/tasks/oxc-migration.md).
    "shadcn/no-arbitrary-values": "off",
    "shadcn/no-inline-styles": "off",
    "shadcn/no-raw-colors": "off",
    "shadcn/no-restyle": "off",

    // Hoisted function declarations are the house style.
    "eslint/no-use-before-define": [
      "error",
      { functions: false, classes: true, variables: true },
    ],

    // TanStack Router `throw redirect()` / `throw notFound()` is idiomatic.
    "typescript/only-throw-error": [
      "error",
      {
        allow: [
          {
            from: "package",
            name: ["Redirect", "NotFoundError"],
            package: "@tanstack/router-core",
          },
        ],
      },
    ],
    // `fn(undefined)` and `.eq("field", undefined)` state intent in Convex
    // filters and form resets.
    "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
    // `void promise` marks an intended fire-and-forget call.
    "eslint/no-void": ["error", { allowAsStatement: true }],

    // React Doctor rules the team silenced in doctor.config.ts.
    "react-doctor/no-adjust-state-on-prop-change": "off",
    "react-doctor/no-cascading-set-state": "off",
    "react-doctor/no-chain-state-updates": "off",
    "react-doctor/no-derived-state": "off",
    "react-doctor/no-effect-chain": "off",
    "react-doctor/no-event-handler": "off",
    "react-doctor/no-initialize-state": "off",
    "react-doctor/no-multi-comp": "off",
    "react-doctor/no-pass-data-to-parent": "off",
    "react-doctor/no-prevent-default": "off",
    "react-doctor/only-export-components": "off",
    "react-doctor/prefer-module-scope-static-value": "off",
    "react-doctor/prefer-useReducer": "off",
    "react-doctor/rerender-state-only-in-handlers": "off",

    // Thresholds = current maximum; they block new, more complex code.
    "eslint/complexity": ["error", { max: 81 }],
    "complexity/complexity": ["error", { cyclomatic: 81, cognitive: 76 }],
  },
  settings: jsPluginSettings,
});
