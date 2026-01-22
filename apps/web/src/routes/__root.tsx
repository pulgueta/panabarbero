import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
  fetchSession,
  getCookieName,
} from "@convex-dev/better-auth/react-start";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { authClient } from "@panabarbero/convex/auth";
import type { Id } from "@panabarbero/convex/dataModel";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import type { ConvexReactClient } from "convex/react";
import { Toaster } from "sonner";

import { BottomBar } from "@/components/layout/bottom-bar";
import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { Header } from "@/components/layout/header";
import { LoadingComponent } from "@/components/layout/loading-component";
import { NotFoundComponent } from "@/components/layout/not-found-component";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { PostHogProvider } from "@/providers/posthog";
import { ThemeProvider } from "@/providers/theme/theme-provider";
import appCss from "@/styles.css?url";

type RouterContext = {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
  user: {
    // @ts-expect-error
    _id: Id<"user">;
    _creationTime: number;
    userId?: string | null | undefined | undefined;
    image?: string | null | undefined | undefined;
    // twoFactorEnabled?: boolean | null | undefined | undefined;
    isAnonymous?: boolean | null | undefined | undefined;
    username?: string | null | undefined | undefined;
    displayUsername?: string | null | undefined | undefined;
    phoneNumber?: string | null | undefined | undefined;
    phoneNumberVerified?: boolean | null | undefined | undefined;
    createdAt: number;
    updatedAt: number;
    email: string;
    emailVerified: boolean;
    name: string;
  } | null;
};

const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { createAuth } = await import("@panabarbero/convex/auth/convex");

  const { session } = await fetchSession(getRequest());
  const sessionCookieName = getCookieName(createAuth);
  const token = getCookie(sessionCookieName);

  return {
    userId: session?.user.id,
    token,
  };
});

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "VirtualPot",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: () => <RootComponent />,
  errorComponent: (props) => <DefaultCatchBoundary {...props} />,
  notFoundComponent: () => <NotFoundComponent />,
  pendingComponent: () => <LoadingComponent />,
  beforeLoad: async (ctx) => {
    const { userId, token } = await fetchAuth();

    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return { userId, token };
  },
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });

  const { isMobile } = useIsMobile();

  return (
    <ThemeProvider>
      <ConvexBetterAuthProvider
        client={context.convexQueryClient.convexClient}
        authClient={authClient}
      >
        <PostHogProvider>
          <QueryClientProvider client={context.queryClient}>
            <RootDocument>
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
                  ]}
                />
              )}
            </RootDocument>
          </QueryClientProvider>
        </PostHogProvider>
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
