import { createFileRoute, redirect } from "@tanstack/react-router";
import type { FC } from "react";

import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { ReviewsDashboard } from "@/components/reviews/shop/reviews-dashboard";
import { ReviewsPending } from "@/components/reviews/shop/reviews-pending";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { cacheTime } from "@/config/cache";
import {
  shopRatingTrendQueryOptions,
  shopReviewBreakdownQueryOptions,
  shopReviewStatsQueryOptions,
} from "@/hooks/use-reviews";

const REVIEWS_DESCRIPTION =
  "Monitorea las reseñas de tus clientes y su moderación.";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/reviews/",
)({
  component: RouteComponent,
  pendingComponent: ReviewsPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Reseñas" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const roles = opts.context.dashboardRoles;

    // Analytics are management-only — barbers (and non-members) land on Citas.
    if (!roles?.isOwner && !roles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (barbershop?._id) {
      // Spine: the stats power the KPI strip + distribution, ready on first paint.
      await opts.context.queryClient.ensureQueryData(
        shopReviewStatsQueryOptions(barbershop._id),
      );

      // Leaves: prime without blocking navigation.
      void opts.context.queryClient.prefetchQuery(
        shopRatingTrendQueryOptions(barbershop._id),
      );
      void opts.context.queryClient.prefetchQuery(
        shopReviewBreakdownQueryOptions(barbershop._id),
      );
    }
  },
});

const NoBarbershop: FC = () => (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>No tienes una barbería asociada.</EmptyTitle>
      <EmptyDescription>
        Crea o únete a una barbería para ver sus reseñas.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

function RouteComponent() {
  // The loader already resolved the barbershop into route context — reading it
  // back avoids a second query and the skeleton flash it caused on navigation.
  const barbershop = Route.useRouteContext({
    select: (context) => context.dashboardBarbershop,
  });

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Reseñas"
          description={REVIEWS_DESCRIPTION}
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop?._id ? (
          <ReviewsDashboard barbershopId={barbershop._id} />
        ) : (
          <NoBarbershop />
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
