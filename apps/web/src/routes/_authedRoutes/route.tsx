import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";
import { getWorkosAuthQueryOptions } from "@/hooks/use-session";

export const Route = createFileRoute("/_authedRoutes")({
  ssr: "data-only",
  beforeLoad: async ({ context }) => {
    let userId = context.userId;

    // `context.userId` is read from the ['workosAuth'] snapshot, which is pinned
    // staleTime=Infinity and never refetched on client navigation. The AuthKit
    // client can refresh/recover the session WITHOUT a full-page reload, so that
    // snapshot can be a stale `null` while the live session is authenticated —
    // which would bounce a logged-in user to /login on a client-side profile
    // navigation (a hard load works because SSR reads the cookie fresh). Only
    // when the snapshot says "logged out" do we pay one revalidation against the
    // real cookie before redirecting; authenticated navigations (truthy
    // snapshot) skip it entirely, so the no-RPC-per-navigation guarantee holds.
    if (!userId) {
      try {
        const fresh = await context.queryClient.fetchQuery({
          ...getWorkosAuthQueryOptions(),
          staleTime: 0,
        });
        userId = fresh.userId;
      } catch {
        // Revalidation failed (network/server) — fall through to the redirect.
      }
    }

    if (!userId) {
      throw redirect({ to: "/login" });
    }

    return { userId };
  },
  component: RouteComponent,
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  return <Outlet />;
}
