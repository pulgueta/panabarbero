import { api } from "@convex/_generated/api";
import { CustomerPortalLink } from "@convex-dev/polar/react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { lazy } from "react";

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
import { usePlan } from "@/hooks/billing/use-plan";
import { useSubscription } from "@/hooks/billing/use-pricing";
import { cn } from "@/lib/utils";

const PricingCards = lazy(() =>
  import("@/components/pricing/pricing-cards").then((module) => ({
    default: module.PricingCards,
  })),
);

export const PlansTab: FC = () => {
  const { isSubscribed, isLoading } = usePlan();

  const { data: subscription } = useSubscription();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-semibold text-2xl">Planes disponibles</h1>
        <p className="text-muted-foreground text-sm">
          Administra tu suscripción o elige el plan que mejor se adapte a tu
          operación.
        </p>
      </header>

      <Card className="w-full max-w-xl">
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
        <CardContent className="space-y-3">
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
                generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
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

      <Separator />

      <PricingCards />
    </div>
  );
};
