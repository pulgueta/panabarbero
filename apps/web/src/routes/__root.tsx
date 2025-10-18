import { TanstackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";

import { BottomBar } from "@/components/bottom-bar";
import { Header } from "@/components/header";
import { useIsMobile } from "@/hooks/use-is-mobile";
import StoreDevtools from "@/lib/demo-store-devtools";

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => {
    const { isMobile } = useIsMobile();

    return (
      <>
        <Toaster richColors position="top-center" />

        {!isMobile && <Header />}
        <Outlet />
        {isMobile && <BottomBar />}

        {process.env.NODE_ENV === "development" && (
          <TanstackDevtools
            config={{
              position: "bottom-left",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              StoreDevtools,
            ]}
          />
        )}
      </>
    );
  },
});
