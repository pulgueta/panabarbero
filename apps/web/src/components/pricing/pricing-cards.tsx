import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePricingPlans } from "@/hooks/billing/use-pricing";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { CustomerPortalLink } from "@convex-dev/polar/react";
import { api } from "@panabarbero/convex/api";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import type { FC } from "react";

export const PricingCards: FC = () => {
  const { data: products } = usePricingPlans();
  const { data: session } = useSession();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id} className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-xl">{product.name}</CardTitle>
            {product.description ? (
              <CardDescription>{product.description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex items-end gap-2">
              {/* <span className="font-semibold text-3xl">{product.priceLabel}</span> */}
              {product.isRecurring ? (
                <span className="text-muted-foreground text-sm">
                  {product.recurringInterval}
                </span>
              ) : null}
            </div>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {product.prices.map((price) => (
                <li key={price.id} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  <span>{price.priceAmount}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter className="mt-auto">
            {session?.userId ? (
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
              <Button asChild className="w-full">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
