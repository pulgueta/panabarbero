import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@panabarbero/convex/auth";
import { ConvexReactClient } from "convex/react";
import type { FC, PropsWithChildren } from "react";

interface ConvexProviderProps extends PropsWithChildren {
  url: string;
}

export const ConvexProvider: FC<ConvexProviderProps> = ({ children, url }) => {
  const convex = new ConvexReactClient(url, {
    expectAuth: true,
  });

  const betterAuthClient = authClient({
    baseURL: url,
  });

  return (
    <ConvexBetterAuthProvider client={convex} authClient={betterAuthClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
};
