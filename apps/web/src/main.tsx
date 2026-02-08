import { ConvexQueryClient } from "@convex-dev/react-query";
import { authClient } from "@panabarbero/convex/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { ConvexAuthProvider } from "better-convex/auth-client";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ThemeProvider } from "@/components/theme";
import { env } from "@/env";
import { PostHogProvider } from "@/providers/posthog";
import reportWebVitals from "./reportWebVitals";
import { routeTree } from "./routeTree.gen";
// @ts-expect-error
import "./styles.css";

export function getRouter() {
  const convex = new ConvexReactClient(env.PUBLIC_CONVEX_URL, {
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
          <ConvexAuthProvider
            client={convexQueryClient.convexClient}
            authClient={authClient}
            onMutationUnauthorized={() => {
              window.location.href = "/login";
            }}
            onQueryUnauthorized={() => {
              window.location.href = "/login";
            }}
          >
            <QueryClientProvider client={queryClient}>
              <PostHogProvider>{children}</PostHogProvider>
            </QueryClientProvider>
          </ConvexAuthProvider>
        </ThemeProvider>
      ),
    }),
    queryClient,
  );

  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={getRouter()} />
    </StrictMode>,
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
