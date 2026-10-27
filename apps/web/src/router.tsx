import { ConvexQueryClient } from "@convex-dev/react-query";
import { notifyManager, QueryClient } from "@tanstack/react-query";
import { createRouter, useRouterState } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { AuthKitProvider } from "@workos/authkit-tanstack-react-start/client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { clientEnv } from "@/env/client";
import { cacheTime } from "./config/cache";
import type { WorkosAuthState } from "./hooks/use-session";
import { fetchWorkosAuth, useAuthFromWorkOS } from "./hooks/use-session";
import reportWebVitals from "./reportWebVitals";
import { routeTree } from "./routeTree.gen";

// Seeds AuthKitProvider with the auth snapshot resolved in the root beforeLoad
// so the client never boots logged-out: no mount-time auth RPC, no transient
// unauthenticated Convex queries overwriting the SSR-hydrated session.
const SeededAuthKitProvider = ({ children }: { children: React.ReactNode }) => {
  const initialAuth = useRouterState({
    select: (state) =>
      (state.matches[0]?.context as { authState?: WorkosAuthState } | undefined)
        ?.authState,
  });

  return (
    <AuthKitProvider initialAuth={initialAuth}>{children}</AuthKitProvider>
  );
};

export function getRouter() {
  if (typeof document !== "undefined") {
    notifyManager.setScheduler(window.requestAnimationFrame);
  }

  const convex = new ConvexReactClient(clientEnv.VITE_CONVEX_URL, {
    verbose: true,
  });

  if (typeof document !== "undefined") {
    // Authenticate the websocket BEFORE the SSR query-cache hydration
    // subscribes Convex queries (they subscribe on the cache "added" event,
    // ahead of React hydration). Without this, hydrated authed queries run
    // anonymously and push null over the dehydrated data — the avatar/sign-in
    // flicker and hydration mismatches on slow loads. setAuth pauses the
    // socket until the token resolves; anonymous visitors resolve null and
    // resume unauthenticated. ConvexProviderWithAuth replaces this fetcher
    // after mount for authenticated sessions.
    convex.setAuth(async () => (await fetchWorkosAuth()).token);
  }

  const convexQueryClient = new ConvexQueryClient(convex);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        staleTime: cacheTime.low,
        gcTime: cacheTime.high,
        retry: 5,
        retryDelay: (attemptIndex) => Math.min(300 * 2 ** attemptIndex, 10000),
      },
    },
  });

  convexQueryClient.connect(queryClient);

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    context: {
      queryClient,
      convexClient: convexQueryClient.convexClient,
      convexQueryClient,
    },
    scrollRestoration: true,
    defaultViewTransition: true,
    defaultErrorComponent: DefaultCatchBoundary,
    InnerWrap: ({ children }) => (
      <SeededAuthKitProvider>
        <ConvexProviderWithAuth
          client={convexQueryClient.convexClient}
          useAuth={useAuthFromWorkOS}
        >
          {children}
        </ConvexProviderWithAuth>
      </SeededAuthKitProvider>
    ),
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }

  interface StaticDataRouteOption {
    breadcrumb?: string;
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
