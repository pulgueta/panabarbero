import { api } from "@convex/_generated/api";
import type { Polar } from "@convex-dev/polar";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
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

type PolarProduct = NonNullable<Awaited<ReturnType<Polar["getProduct"]>>>;

export interface PricingCardProps {
  product: PolarProduct;
  /** Yearly counterpart offered alongside `product` in the same checkout. */
  yearlyProduct?: PolarProduct;
  userId: string | undefined;
}

export const PricingCard: FC<PricingCardProps> = ({
  product,
  yearlyProduct,
  userId,
}) => {
  const { data: subscription } = useSubscription();

  const copPrices = product.prices.find(
    (price) => price.priceCurrency === "cop",
  );

  const checkoutProductIds = yearlyProduct
    ? [product.id, yearlyProduct.id]
    : [product.id];

  const hasActiveSubscription = subscription?.isSubscribed === true;
  const isSubscribedToThisPlan =
    hasActiveSubscription &&
    !!subscription?.productId &&
    checkoutProductIds.includes(subscription.productId);

  return (
    <Card className="flex h-full max-h-none min-h-115 flex-col">
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        {product.description ? (
          <CardDescription>{product.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-end gap-2">
          <span className="font-semibold text-3xl">
            {(copPrices?.priceAmount ?? 0) === 0
              ? "Gratis"
              : formatCurrency((copPrices?.priceAmount ?? 0) / 100)}
          </span>
          {product.isRecurring && (copPrices?.priceAmount ?? 0) > 0 && (
            <span className="text-muted-foreground text-sm">
              {product.recurringInterval === "year" ? "Anual" : "Mensual"}
            </span>
          )}
        </div>
        <ul className="space-y-2 text-muted-foreground text-sm">
          {product.benefits?.map((benefit) => (
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
        ) : isSubscribedToThisPlan ? (
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
            productIds={checkoutProductIds}
            className={cn(buttonVariants({ className: "w-full" }), {
              "pointer-events-none opacity-50": hasActiveSubscription,
            })}
            lazy
            locale="es-CO"
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
