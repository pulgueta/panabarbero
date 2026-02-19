import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { Link } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { CheckCircle2 } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePricingPlans, useSubscription } from "@/hooks/billing/use-pricing";
import { useSession } from "@/hooks/use-session";
import { cn, formatCurrency } from "@/lib/utils";

export const PricingCards: FC = () => {
  const [activeTab, setActiveTab] = useState<"yearly" | "monthly">("monthly");

  const { data: products } = usePricingPlans();
  const { data: session } = useSession();
  const { data: subscription } = useSubscription();

  const yearlyProducts = products.filter(
    (product) => product.recurringInterval === "year",
  );

  const monthlyProducts = products.filter(
    (product) => product.recurringInterval === "month",
  );

  const displayedProducts =
    activeTab === "yearly" ? yearlyProducts : monthlyProducts;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
          <Label>Mensual</Label>
          <Switch
            checked={activeTab === "yearly"}
            onCheckedChange={(checked) =>
              setActiveTab(checked ? "yearly" : "monthly")
            }
          />
          <Label>Anual</Label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {displayedProducts.map((product) => {
          const isSubscribed = subscription?.productId === product.id;

          return (
            <Card key={product.id} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{product.name}</CardTitle>
                {product.description ? (
                  <CardDescription>{product.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-end gap-2">
                  <span className="font-semibold text-3xl">
                    {product.prices[0].priceAmount &&
                    product.prices[0].priceAmount > 0
                      ? formatCurrency(
                          product.prices[0].priceAmount / 100,
                          "USD",
                        )
                      : "  Gratis"}
                  </span>
                  {product.isRecurring &&
                    product.prices[0].priceAmount &&
                    product.prices[0].priceAmount > 0 && (
                      <span className="text-muted-foreground text-sm">
                        {product.recurringInterval === "year"
                          ? "Anual"
                          : "Mensual"}
                      </span>
                    )}
                </div>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  {product.benefits?.map((benefit) => (
                    <li key={benefit.id} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                      <span>{benefit.description}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="mt-auto">
                {session?.userId ? (
                  isSubscribed ? (
                    <CustomerPortalLink
                      polarApi={{
                        generateCustomerPortalUrl:
                          api.polar.generateCustomerPortalUrl,
                      }}
                      className={cn(buttonVariants({ className: "w-full" }))}
                    >
                      Administrar suscripción
                    </CustomerPortalLink>
                  ) : (
                    <CheckoutLink
                      polarApi={{
                        generateCheckoutLink: api.polar.generateCheckoutLink,
                      }}
                      productIds={[product.id]}
                      className={cn(buttonVariants({ className: "w-full" }))}
                    >
                      Adquirir plan
                    </CheckoutLink>
                  )
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/login">Iniciar sesión para adquirir plan</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
