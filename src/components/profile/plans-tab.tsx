import { CustomerPortalLink } from "@convex-dev/polar/react";
import { api } from "@convex/_generated/api";
import { CheckCircleIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { Suspense, lazy } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBarbershopByOwnerId } from "@/hooks/barbershop/use-barbershop";
import { usePlan } from "@/hooks/billing/use-plan";
import { useSubscription } from "@/hooks/billing/use-pricing";
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

export const PlansTab: FC = () => {
  const { isSubscribed, isLoading } = usePlan();
  const { data: session } = useSession();
  const { data: subscription } = useSubscription();
  const { data: barbershop } = useBarbershopByOwnerId(session?.userId ?? "");

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="min-h-99.75 w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {subscription?.product?.name}{" "}
              {isSubscribed && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                  Actual
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {subscription?.product?.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">
                Cargando información del plan…
              </p>
            ) : (
              <ul className="space-y-1.5 text-muted-foreground text-sm">
                {subscription?.product?.benefits?.map((benefit) => (
                  <li key={benefit.id} className="flex items-start gap-2">
                    <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{benefit.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            {isSubscribed ? (
              <CustomerPortalLink
                polarApi={{
                  generateCustomerPortalUrl:
                    api.polar.generateCustomerPortalUrl,
                }}
                className={cn(
                  buttonVariants({ variant: "outline", className: "w-full" }),
                )}
              >
                Administrar suscripción
              </CustomerPortalLink>
            ) : (
              <Skeleton className="h-10 w-full" />
            )}
          </CardFooter>
        </Card>

        {barbershop && (
          <Suspense fallback={<Skeleton className="h-full w-full rounded-xl" />}>
            <ExtraCreditsCards barbershopId={barbershop._id} />
          </Suspense>
        )}
      </div>

      <Separator />

      <PricingCards />
    </div>
  );
};
