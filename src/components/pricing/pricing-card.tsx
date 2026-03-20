import type { Polar } from "@convex-dev/polar";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { api } from "@convex/_generated/api";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
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
import { useSubscription } from "@/hooks/billing/use-pricing";
import { cn, formatCurrency } from "@/lib/utils";

export interface PricingCardProps {
  product: Awaited<ReturnType<Polar["getProduct"]>>;
  products: Awaited<ReturnType<Polar["getProduct"]>>[];
  userId: string | undefined;
}

export const PricingCard: FC<PricingCardProps> = ({
  product,
  products,
  userId,
}) => {
  const { data: subscription } = useSubscription();

  const yearlyProducts = products.filter(
    (product) => product?.recurringInterval === "year",
  );

  const usdPrices = product?.prices.find(
    (price) => price.priceCurrency === "usd",
  );

  const yearlyProduct = yearlyProducts.find((p) => p?.name === product?.name);
  const checkoutProductIds = yearlyProduct
    ? [product?.id, yearlyProduct?.id]
    : [product?.id];

  const productIdsForThisPlan = checkoutProductIds;
  const activeProductId =
    subscription?.productId ?? subscription?.productPlanId;
  const hasActiveSubscription = subscription?.isSubscribed === true;
  const isSubscribedToThisPlan =
    (hasActiveSubscription &&
      !!activeProductId &&
      productIdsForThisPlan.includes(activeProductId)) ??
    false;

  return (
    <Card className="flex min-h-115 flex-col">
      <CardHeader>
        <CardTitle>{product?.name}</CardTitle>
        {product?.description ? (
          <CardDescription>{product.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-end gap-2">
          <span className="font-semibold text-3xl">
            {formatCurrency((usdPrices?.priceAmount ?? 0) / 100, "USD")}
          </span>
          {product?.isRecurring &&
            usdPrices?.priceAmount &&
            usdPrices.priceAmount > 0 && (
              <span className="text-muted-foreground text-sm">
                {product?.recurringInterval === "year" ? "Anual" : "Mensual"}
              </span>
            )}
        </div>
        <ul className="space-y-2 text-muted-foreground text-sm">
          {product?.benefits?.map((benefit) => (
            <li key={benefit.id} className="flex items-center gap-x-1.5">
              <CheckCircleIcon className="text-primary" size={16} />

              <span>{benefit.description}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {!userId ? (
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
              generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
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
            productIds={checkoutProductIds.filter((id) => id !== undefined)}
            className={cn(buttonVariants({ className: "w-full" }), {
              "pointer-events-none opacity-50": hasActiveSubscription,
            })}
            lazy
          >
            {hasActiveSubscription
              ? "Cambia tu plan desde el portal"
              : "Adquirir plan"}
          </CheckoutLink>
        )}
      </CardFooter>
    </Card>
  );
};
