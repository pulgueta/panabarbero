import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import StoreDevtools from "@/lib/demo-store-devtools";
import { BottomBar } from "./bottom-bar";
import { Header } from "./header";

export const App = () => {
  const { isMobile } = useIsMobile();

  return (
    <>
      <HeadContent />
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
            StoreDevtools,
          ]}
        />
      )}
    </>
  );
};
