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
import { createServerFn } from "@tanstack/react-start";
import { Analytics } from "@vercel/analytics/react";
import type { ConvexReactClient } from "convex/react";

import { BottomBar } from "@/components/layout/bottom-bar";
import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { Header } from "@/components/layout/header";
import { LoadingComponent } from "@/components/layout/loading-component";
import { NotFoundComponent } from "@/components/layout/not-found-component";
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getSessionQueryOptions } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";
import { getThemeServerFn } from "@/lib/theme";
import { seo } from "@/lib/utils";
import { PostHogProvider } from "@/providers/posthog";
import appCss from "@/styles.css?url";

type RouterContext = {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
};

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: seo({
      title: "PanaBarbero - Descubre barberías.",
      description: "La solución que impulsa las barberías en Colombia.",
    }),
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const [theme, token, user] = await Promise.all([
      getThemeServerFn(),
      getAuth(),
      context.queryClient.ensureQueryData(getSessionQueryOptions()),
    ]);

    if (token) {
      context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return {
      theme,
      token,
      user,
    };
  },
  shellComponent: () => <RootComponent />,
  errorComponent: (props) => <DefaultCatchBoundary {...props} />,
  notFoundComponent: () => <NotFoundComponent />,
  pendingComponent: () => <LoadingComponent />,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  const { theme, convexQueryClient, queryClient, token } =
    Route.useRouteContext();

  const { isMobile } = useIsMobile();

  return (
    <html lang="es" suppressHydrationWarning className={theme}>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ConvexBetterAuthProvider
            client={convexQueryClient.convexClient}
            authClient={authClient}
            initialToken={token}
          >
            <PostHogProvider>
              {process.env.NODE_ENV === "production" && <Analytics />}

              <Toaster richColors position="top-center" />

              {!isMobile && <Header />}
              {children}
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
                  ]}
                />
              )}
              <Scripts />
            </PostHogProvider>
          </ConvexBetterAuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
};
