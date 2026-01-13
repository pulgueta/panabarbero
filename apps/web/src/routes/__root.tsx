import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { Id } from "@panabarbero/convex/dataModel";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";

import { App } from "@/components/layout/app";
import { DefaultCatchBoundary } from "@/components/layout/error-component";
import { LoadingComponent } from "@/components/layout/loading-component";
import { NotFoundComponent } from "@/components/layout/not-found-component";
import { getSessionQueryOptions } from "@/hooks/use-session";
import { seo } from "@/lib/utils";

type RouterContext = {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
  user: {
    // @ts-expect-error
    _id: Id<"user">;
    _creationTime: number;
    userId?: string | null | undefined | undefined;
    image?: string | null | undefined | undefined;
    twoFactorEnabled?: boolean | null | undefined | undefined;
    isAnonymous?: boolean | null | undefined | undefined;
    username?: string | null | undefined | undefined;
    displayUsername?: string | null | undefined | undefined;
    phoneNumber?: string | null | undefined | undefined;
    phoneNumberVerified?: boolean | null | undefined | undefined;
    createdAt: number;
    updatedAt: number;
    email: string;
    emailVerified: boolean;
    name: string;
  } | null;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: seo({
      title: "PanaBarbero - La solución para las barberías",
      description: "La solución para las barberías",
    }),
  }),
  component: () => <App />,
  errorComponent: (props) => <DefaultCatchBoundary {...props} />,
  notFoundComponent: () => <NotFoundComponent />,
  pendingComponent: () => <LoadingComponent />,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user) {
      context.user = user;
    }
  },
});
