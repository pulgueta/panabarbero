import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { FC, PropsWithChildren } from "react";

import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import StoreDevtools from "@/lib/demo-store-devtools";
import { BottomBar } from "./bottom-bar";
import { Header } from "./header";

export const App: FC<PropsWithChildren> = ({ children }) => {
  const { isMobile } = useIsMobile();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />

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
      </body>
    </html>
  );
};
