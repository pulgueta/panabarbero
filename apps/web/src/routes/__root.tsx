import { TanstackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import StoreDevtools from "@/lib/demo-store-devtools";

export const Route = createRootRoute({
  component: () => (
    <>
      <Header />
      <Outlet />
      <Toaster />
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
    </>
  ),
});
