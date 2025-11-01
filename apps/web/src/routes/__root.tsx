import type { ConvexQueryClient } from "@convex-dev/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ConvexReactClient } from "convex/react";

import { DefaultCatchBoundary } from "@/components/error-component";
import { BottomBar } from "@/components/layout/bottom-bar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import StoreDevtools from "@/lib/demo-store-devtools";

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
  component: () => {
    const { isMobile } = useIsMobile();

    return (
      <>
        <HeadContent />
        <Toaster richColors position="top-center" />

        {!isMobile && <Header />}
        <Outlet />
        {isMobile && <BottomBar />}

        {process.env.NODE_ENV === "development" && (
          <TanStackDevtools
            config={{
              position: "bottom-left",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              {
                name: "TanStack Query",
                render: <ReactQueryDevtoolsPanel />,
              },
              StoreDevtools,
            ]}
          />
        )}
      </>
    );
  },
  errorComponent: (props) => <DefaultCatchBoundary {...props} />,
});
