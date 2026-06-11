/// <reference types="vite/client" />

import type { ConvexQueryClient } from "@convex-dev/react-query";
import { IconContext } from "@phosphor-icons/react";
import { PostHogProvider } from "@posthog/react";
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
import type { ConvexReactClient } from "convex/react";

import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { Header } from "@/components/layout/header";
import { LoadingComponent } from "@/components/layout/loading-component";
import { BottomNav } from "@/components/layout/nav/bottom-nav";
import { MobileTopBar } from "@/components/layout/nav/mobile-top-bar";
import { NotFoundComponent } from "@/components/layout/not-found-component";
import { PostHogAuthSync } from "@/components/layout/posthog-auth-sync";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { clientEnv } from "@/env/client";
import { getWorkosAuthQueryOptions } from "@/hooks/use-session";
import { seo, websiteStructuredData } from "@/lib/utils";
import appCss from "@/styles.css?url";

type RouterContext = {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    const { token, userId, authState } =
      await context.queryClient.ensureQueryData(getWorkosAuthQueryOptions());

    if (token) {
      context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return {
      token,
      userId,
      authState,
    };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:site_name", content: "PanaBarbero" },
      { property: "og:locale", content: "es_CO" },
      ...seo({
        title: "PanaBarbero - Descubre barberías",
        description: "La solución para las barberías.",
        canonical: "https://www.panabarbero.com",
      }),
    ],
    links: [
      { rel: "preconnect", href: clientEnv.VITE_STORAGE_URL },
      { rel: "dns-prefetch", href: clientEnv.VITE_STORAGE_URL },
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://www.panabarbero.com" },
      { rel: "sitemap", href: "/sitemap.xml" },
    ],
    scripts: [websiteStructuredData()],
  }),
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

const ICON_CONTEXT_VALUE = { weight: "bold", size: 24 } as const;

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  const { queryClient } = Route.useRouteContext();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <PostHogProvider
            apiKey={clientEnv.VITE_POSTHOG_API_KEY}
            options={{
              api_host: "https://us.i.posthog.com",
              defaults: "2026-01-30",
              capture_exceptions: true,
              autocapture: true,
            }}
          >
            <PostHogAuthSync />
            <ThemeProvider>
              <IconContext.Provider value={ICON_CONTEXT_VALUE}>
                <Toaster richColors position="top-center" />

                <MobileTopBar />
                <Header />

                <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                  {children}
                </div>

                <BottomNav />
              </IconContext.Provider>
            </ThemeProvider>

            <Scripts />
          </PostHogProvider>
        </QueryClientProvider>

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
      </body>
    </html>
  );
};
