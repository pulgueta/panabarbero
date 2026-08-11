import { api } from "@convex/_generated/api";
import { CustomerPortalLink } from "@convex-dev/polar/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import { lazy, Suspense } from "react";

import { BillingPlanCard } from "@/components/barbershops/settings/billing-plan-card";
import { SettingsPageSkeleton } from "@/components/barbershops/settings/settings-page-skeleton";
import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  getBarbershopQuotaUsageQueryOptions,
  getExtraCreditsQueryOptions,
} from "@/hooks/billing/use-credits";
import { getBarbershopPlanQueryOptions } from "@/hooks/billing/use-plan";
import {
  getConfiguredProductsQueryOptions,
  getSubscriptionQueryOptions,
  useSubscription,
} from "@/hooks/billing/use-pricing";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const PricingCards = lazy(() =>
  import("@/components/pricing/pricing-cards").then((module) => ({
    default: module.PricingCards,
  })),
);

const ExtraCreditsCards = lazy(() =>
  import("@/components/profile/extra-credits-cards").then((module) => ({
    default: module.ExtraCreditsCards,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings/billing/",
)({
  component: BillingSettingsPage,
  pendingComponent: () => (
    <SettingsPageSkeleton blocks={["h-52", "h-52"]} className="max-w-5xl" />
  ),
  ssr: "data-only",
  staticData: { breadcrumb: "Facturación" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const userId = opts.context.userId;

    if (userId) {
      const barbershopMemberRoles = opts.context.dashboardRoles;

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      const { queryClient } = opts.context;

      // A single Promise.all so every promise has a rejection handler from
      // creation — no unhandled-rejection window while the barbershop query
      // is in flight.
      await Promise.all([
        queryClient.ensureQueryData(getConfiguredProductsQueryOptions()),
        queryClient.ensureQueryData(getSubscriptionQueryOptions()),
        queryClient
          .ensureQueryData(barbershopByOwnerIdQueryOptions(userId))
          .then((barbershop) => {
            if (!barbershop) {
              return;
            }

            // Streamed: the credits section suspends on these behind its own
            // Suspense boundary.
            void queryClient.prefetchQuery(getExtraCreditsQueryOptions());
            void queryClient.prefetchQuery(
              getBarbershopQuotaUsageQueryOptions(barbershop._id),
            );

            return queryClient.ensureQueryData(
              getBarbershopPlanQueryOptions(barbershop._id),
            );
          }),
      ]);
    }
  },
});

interface BillingSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** Titled region of the billing hub — heading outside the cards it groups. */
const BillingSection: FC<BillingSectionProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-semibold text-lg tracking-tight">{title}</h2>
        <p className="max-w-prose text-pretty text-muted-foreground text-sm">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
};

function BillingSettingsPage() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(user?.id ?? "");
  const { data: subscription } = useSubscription();

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Facturación"
          description="Tu plan, la compra de créditos y la gestión de tu suscripción."
        />
        {subscription?.isSubscribed && (
          <DashboardPageActions>
            <CustomerPortalLink
              polarApi={{
                generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
              }}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Administrar suscripción
            </CustomerPortalLink>
          </DashboardPageActions>
        )}
      </DashboardPageHeader>

      <DashboardPageContent className="space-y-10">
        {barbershop && (
          <BillingSection
            title="Tu plan"
            description="Resumen del plan activo y su capacidad operativa."
          >
            <BillingPlanCard barbershopId={barbershop._id} />
          </BillingSection>
        )}

        {barbershop && (
          <BillingSection
            title="Créditos extra"
            description="Compra SMS y correos adicionales cuando agotes los incluidos en tu plan. Los créditos no vencen."
          >
            <Suspense
              fallback={
                <div className="grid gap-4 lg:grid-cols-2">
                  <Skeleton className="h-115 w-full rounded-xl" />
                  <Skeleton className="h-115 w-full rounded-xl" />
                </div>
              }
            >
              <ExtraCreditsCards barbershopId={barbershop._id} />
            </Suspense>
          </BillingSection>
        )}

        <BillingSection
          title="Planes"
          description="Cambia de plan cuando tu operación lo necesite. Polar procesa el pago de forma segura."
        >
          <Suspense
            fallback={
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-115 w-full rounded-xl" />
                <Skeleton className="h-115 w-full rounded-xl" />
                <Skeleton className="h-115 w-full rounded-xl" />
              </div>
            }
          >
            <PricingCards />
          </Suspense>
        </BillingSection>
      </DashboardPageContent>
    </DashboardPage>
  );
}
