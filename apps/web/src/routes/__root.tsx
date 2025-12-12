import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";

import { App } from "@/components/layout/app";
import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { NotFoundComponent } from "@/components/layout/not-found-component";
import { getSessionQueryOptions } from "@/hooks/use-session";
import { seo } from "@/lib/utils";

type RouterContext = {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: seo({
      title: "PanaBarbero - La solución para las barberías",
      description: "La solución para las barberías",
    }),
  }),
  component: () => <App />,
  errorComponent: (props) => <DefaultCatchBoundary {...props} />,
  notFoundComponent: () => <NotFoundComponent />,
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(getSessionQueryOptions());
  },
});
