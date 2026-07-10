import type { ReactDoctorConfig } from "react-doctor/api";

export default {
  ignore: {
    // Design system ignored due to out-of-the-box configuration and working by default.
    files: [
      "node_modules",
      "convex/_generated",
      ".output/**",
      ".agents/**",
      ".claude/**",
      "src/components/ui/**",
    ],

    // Rules silenced everywhere — each is either a verified false positive for
    // this stack (TanStack Start + Convex + react-hook-form) or a family the
    // team has decided not to enforce.
    rules: [
      // "You Might Not Need an Effect" family. Our forms deliberately sync
      // react-hook-form / Convex / Zustand state through effects.
      "react-doctor/no-derived-state",
      "react-doctor/no-event-handler",
      "react-doctor/no-adjust-state-on-prop-change",
      "react-doctor/no-effect-chain",
      "react-doctor/no-chain-state-updates",
      "react-doctor/no-cascading-set-state",
      "react-doctor/no-initialize-state",
      "react-doctor/no-pass-data-to-parent",
      "react-doctor/prefer-useReducer",
      "react-doctor/rerender-state-only-in-handlers",

      // react-hook-form submit handlers legitimately call e.preventDefault();
      // <form action> (the rule's suggestion) is a server-action pattern that
      // doesn't fit this client-rendered RHF + TanStack setup.
      "react-doctor/no-prevent-default",

      // Fast-Refresh-only rule. TanStack route modules must export both `Route`
      // and a route component, and we co-locate lazy() splits / schemas / data
      // by convention across the codebase.
      "react-doctor/only-export-components",

      // formIds = { field: useId() } cannot move to module scope: useId() is a
      // hook. The rule's "hoist this static value" advice is impossible here.
      "react-doctor/prefer-module-scope-static-value",
      "react-doctor/no-multi-comp",
      "deslop/unused-export",
      "deslop/unused-file",
      "deslop/circular-dependency",
    ],

    overrides: [
      // The effect here *does* return its cleanup (`return unsubscribe`).
      {
        files: ["src/components/landing/notifications-section.tsx"],
        rules: ["react-doctor/effect-needs-cleanup"],
      },

      // navigate() is called inside event handlers (onTabChange / handleAnswer),
      // not during render.
      {
        files: [
          "src/routes/_authedRoutes/profile/index.tsx",
          "src/routes/_authedRoutes/invitations/$code.tsx",
        ],
        rules: ["react-doctor/tanstack-start-no-navigate-in-render"],
      },

      // The loader's two awaits are dependent (the 2nd needs user.userId); the
      // independent metadata fetches already use Promise.all.
      {
        files: ["src/routes/barbershops/index.tsx"],
        rules: ["react-doctor/tanstack-start-loader-parallel-fetch"],
      },

      // Renders trusted, server-rendered markdown from local .md files.
      {
        files: ["src/components/markdown.tsx"],
        rules: ["react-doctor/no-danger"],
      },

      // Recharts-backed dashboard charts. The route they live on is already
      // code-split (autoCodeSplitting), so a further per-component dynamic
      // import buys nothing beyond a loading flicker.
      {
        files: [
          "src/components/analytics/appointments-trend-chart.tsx",
          "src/components/analytics/revenue-trend-chart.tsx",
          "src/components/analytics/top-breakdown-chart.tsx",
          "src/components/analytics/weekday-chart.tsx",
          "src/components/inventory/category-breakdown-chart.tsx",
          "src/components/inventory/movement-trend-chart.tsx",
          "src/components/reviews/shop/rating-trend.tsx",
        ],
        rules: ["react-doctor/prefer-dynamic-import"],
      },
    ],
  },
} satisfies ReactDoctorConfig;
