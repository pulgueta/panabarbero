/// <reference types="vite/client" />

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Analytics } from "@vercel/analytics/react";
import type { ConvexReactClient } from "convex/react";

import { BottomBar } from "@/components/layout/bottom-bar";
import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { Header } from "@/components/layout/header";
import { LoadingComponent } from "@/components/layout/loading-component";
import { NotFoundComponent } from "@/components/layout/not-found-component";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { authClient } from "@/lib/auth-client";
import { seo } from "@/lib/utils";
import { PostHogProvider } from "@/providers/posthog";

type RouterContext = {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: seo({
      title: "PanaBarbero - Descubre barberías",
      description: "La solución para las barberías.",
    }),
  }),
  component: RootComponent,
  errorComponent: (props) => <DefaultCatchBoundary {...props} />,
  notFoundComponent: () => <NotFoundComponent />,
  pendingComponent: () => <LoadingComponent />,
});

function RootComponent() {
  const { convexClient, queryClient } = Route.useRouteContext();

  const { isMobile } = useIsMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
        <PostHogProvider>
          {process.env.NODE_ENV === "production" && <Analytics />}
          <ThemeProvider>
            <Toaster richColors position="top-center" />
            {!isMobile && <Header />}
            <HeadContent />
            <Outlet />
            <Scripts />
            {isMobile && <BottomBar />}
          </ThemeProvider>
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
              ]}
            />
          )}
        </PostHogProvider>
      </ConvexBetterAuthProvider>
    </QueryClientProvider>
  );
}
