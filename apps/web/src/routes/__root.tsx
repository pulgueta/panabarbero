import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";

import { App } from "@/components/layout/app";
import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { NotFoundComponent } from "@/components/layout/not-found-component";

type RouterContext = {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => {
    return {
      meta: [
        {
          title: "PanaBarbero - La solución para las barberías",
        },
        {
          name: "description",
          content: "PanaBarbero - La solución para las barberías",
        },
        {
          name: "og:title",
          content: "PanaBarbero - La solución para las barberías",
        },
        {
          name: "og:description",
          content: "PanaBarbero - La solución para las barberías",
        },
        {
          name: "og:image",
          content: "/logo.png",
        },
        {
          name: "og:url",
          content: "https://panabarbero.com",
        },
        {
          name: "og:type",
          content: "website",
        },
        {
          name: "og:locale",
          content: "es_CO",
        },
      ],
    };
  },
  component: () => <App />,
  errorComponent: (props) => <DefaultCatchBoundary {...props} />,
  notFoundComponent: () => <NotFoundComponent />,
});
