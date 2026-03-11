/// <reference types="vite/client" />

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { IconContext } from "@phosphor-icons/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
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
import { SpeedInsights } from "@vercel/speed-insights/react";
import type { ConvexReactClient } from "convex/react";

import { BottomBar } from "@/components/layout/bottom-bar";
import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { Header } from "@/components/layout/header";
import { LoadingComponent } from "@/components/layout/loading-component";
import { NotFoundComponent } from "@/components/layout/not-found-component";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";
import { seo } from "@/lib/utils";
import appCss from "@/styles.css?url";

const getAuth = createServerFn({ method: "GET" }).handler(
  async () => await getToken(),
);

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
      canonical: "https://panabarbero.com",
    }),
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://panabarbero.com" },
      { rel: "sitemap", href: "/sitemap.xml" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const token = await getAuth();

    if (token) {
      context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return {
      token,
    };
  },
  shellComponent: () => <RootComponent />,
  errorComponent: (props) => (
    <RootDocument>
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
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
  const { convexQueryClient, queryClient, token } = Route.useRouteContext();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {process.env.NODE_ENV === "production" && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}

        <QueryClientProvider client={queryClient}>
          <ConvexBetterAuthProvider
            client={convexQueryClient.convexClient}
            authClient={authClient}
            initialToken={token}
          >
            <ThemeProvider>
              <IconContext.Provider value={{ weight: "bold", size: 24 }}>
                <Toaster richColors position="top-center" />

                <Header />

                {children}

                <BottomBar />
              </IconContext.Provider>
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
            <Scripts />
          </ConvexBetterAuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
};
