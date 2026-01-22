import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { authClient } from "@panabarbero/convex/auth";
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { ConvexReactClient } from "convex/react";

import { env } from "@/env";
import { PostHogProvider } from "@/providers/posthog";
import { ThemeProvider } from "@/providers/theme/theme-provider";

import { routeTree } from "./routeTree.gen";
import "./styles.css";

export function getRouter() {
  if (typeof document !== "undefined") {
    notifyManager.setScheduler(window.requestAnimationFrame);
  }

  const convex = new ConvexReactClient(env.VITE_CONVEX_URL, {
    verbose: true,
  });

  const convexQueryClient = new ConvexQueryClient(convex);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        experimental_prefetchInRender: true,
        staleTime: 15 * 60 * 1000,
        retry: (failureCount, error) => {
          if (error && typeof error === "object" && "status" in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          return failureCount < 3;
        },
      },
    },
  });

  convexQueryClient.connect(queryClient);

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: "intent",
      context: {
        queryClient,
        convexClient: convexQueryClient.convexClient,
        convexQueryClient,
        user: null,
      },
      scrollRestoration: true,
      defaultViewTransition: true,
      Wrap: ({ children }) => (
        <ThemeProvider>
          <ConvexBetterAuthProvider
            client={convexQueryClient.convexClient}
            authClient={authClient}
          >
            <PostHogProvider>
              <QueryClientProvider client={queryClient}>
                {children}
              </QueryClientProvider>
            </PostHogProvider>
          </ConvexBetterAuthProvider>
        </ThemeProvider>
      ),
    }),
    queryClient,
  );

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
