import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { authClient } from "@panabarbero/convex/auth";
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ClientOnly, createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { ConvexReactClient } from "convex/react";

import { ThemeProvider } from "@/components/theme";
import { env } from "@/env";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  if (typeof document !== "undefined") {
    notifyManager.setScheduler(window.requestAnimationFrame);
  }

  const convex = new ConvexReactClient(env.VITE_CONVEX_URL, {
    verbose: true,
  });
  // @ts-expect-error
  const convexQueryClient = new ConvexQueryClient(convex);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        experimental_prefetchInRender: true,
        staleTime: 15 * 60 * 1000,
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
        convexClient: convex,
        convexQueryClient,
        user: null,
      },
      scrollRestoration: true,
      defaultViewTransition: true,
      Wrap: ({ children }) => (
        <ClientOnly fallback={null}>
          <ThemeProvider defaultTheme="system">
            <ConvexBetterAuthProvider client={convex} authClient={authClient}>
              <QueryClientProvider client={queryClient}>
                {children}
              </QueryClientProvider>
            </ConvexBetterAuthProvider>
          </ThemeProvider>
        </ClientOnly>
      ),
    }),
    queryClient,
  );

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
    handleRedirects: true,
    wrapQueryClient: true,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
