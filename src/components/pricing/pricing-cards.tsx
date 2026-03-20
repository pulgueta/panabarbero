import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import type { FC } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePricingPlans, useSubscription } from "@/hooks/billing/use-pricing";
import { useSession } from "@/hooks/use-session";
import { cn, formatCurrency } from "@/lib/utils";

export const PricingCards: FC = () => {
  const { data: products } = usePricingPlans();
  const { data: session } = useSession();
  const { data: subscription } = useSubscription();

  const yearlyProducts = products.filter(
    (product) => product.recurringInterval === "year",
  );

  const monthlyProducts = products.filter(
    (product) => product.recurringInterval === "month",
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {monthlyProducts.map((product) => {
        const usdPrices = product.prices.find(
          (price) => price.priceCurrency === "usd",
        );
        const yearlyProduct = yearlyProducts.find(
          (p) => p.name === product.name,
        );
        const checkoutProductIds = yearlyProduct
          ? [product.id, yearlyProduct.id]
          : [product.id];

        const productIdsForThisPlan = checkoutProductIds;
        const activeProductId =
          subscription?.productId ?? subscription?.productPlanId;
        const hasActiveSubscription = subscription?.isSubscribed === true;
        const isSubscribedToThisPlan =
          hasActiveSubscription &&
          activeProductId &&
          productIdsForThisPlan.includes(activeProductId);

        return (
          <Card key={product.id} className="flex min-h-115 flex-col">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl xl:text-3xl">
                {product.name}
              </CardTitle>
              {product.description ? (
                <CardDescription>{product.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex items-end gap-2">
                <span className="font-semibold text-3xl">
                  {formatCurrency((usdPrices?.priceAmount ?? 0) / 100, "USD")}
                </span>
                {product.isRecurring &&
                  usdPrices?.priceAmount &&
                  usdPrices.priceAmount > 0 && (
                    <span className="text-muted-foreground text-sm">
                      Mensual
                    </span>
                  )}
              </div>
              <ul className="space-y-2 text-muted-foreground text-sm">
                {product.benefits?.map((benefit) => (
                  <li key={benefit.id} className="flex items-start gap-2">
                    <CheckCircleIcon className="mt-0.5 size-4 text-primary" />
                    <span>{benefit.description}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="mt-auto">
              {!session?.userId ? (
                <Button
                  nativeButton={false}
                  className="w-full"
                  render={<Link to="/login" />}
                >
                  Iniciar sesión para adquirir plan
                </Button>
              ) : hasActiveSubscription && isSubscribedToThisPlan ? (
                <CustomerPortalLink
                  polarApi={{
                    generateCustomerPortalUrl:
                      api.polar.generateCustomerPortalUrl,
                  }}
                  className={cn(
                    buttonVariants({ className: "w-full", variant: "outline" }),
                  )}
                >
                  Administrar suscripción
                </CustomerPortalLink>
              ) : (
                <CheckoutLink
                  polarApi={{
                    generateCheckoutLink: api.polar.generateCheckoutLink,
                  }}
                  productIds={checkoutProductIds}
                  className={cn(buttonVariants({ className: "w-full" }))}
                  lazy
                >
                  Adquirir plan
                </CheckoutLink>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
