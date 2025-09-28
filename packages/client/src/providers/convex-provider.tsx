import {
  ConvexProvider as ConvexProviderBase,
  ConvexReactClient,
} from "convex/react";
import type { FC, PropsWithChildren } from "react";

interface ConvexProviderProps extends PropsWithChildren {
  url: string;
}

export const ConvexProvider: FC<ConvexProviderProps> = ({ children, url }) => {
  const convex = new ConvexReactClient(url, {
    expectAuth: true,
  });

  return <ConvexProviderBase client={convex}>{children}</ConvexProviderBase>;
};
