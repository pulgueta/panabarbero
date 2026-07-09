import { api } from "@convex/_generated/api";
import type { Barbershop, ExtraCredits } from "@convex/schema";
import { CheckoutLink } from "@convex-dev/polar/react";
import type { FC } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBarbershopQuotaUsage,
  useExtraCredits,
} from "@/hooks/billing/use-credits";
import { useConfiguredProducts } from "@/hooks/billing/use-pricing";
import { cn, formatCurrency } from "@/lib/utils";

interface CreditCardProps {
  productId: string;
  name: string;
  description: string;
  priceCop: number;
  currentCredits: number;
  maxCredits: number;
  barbershopId: string;
  workosOrganizationId?: string;
  isLoading: boolean;
  planQuotaUsed: number;
  planQuotaMax: number;
}

const CreditCard: FC<CreditCardProps> = ({
  productId,
  name,
  description,
  priceCop,
  currentCredits,
  maxCredits,
  barbershopId,
  workosOrganizationId,
  isLoading,
  planQuotaUsed,
  planQuotaMax,
}) => {
  const hasCredits = currentCredits > 0;
  const percentage = maxCredits > 0 ? (currentCredits / maxCredits) * 100 : 0;

  const planLabel = "WhatsApp incluidos";

  const isUnlimitedPlan = planQuotaMax === 0;
  const planRemaining =
    planQuotaMax > 0 ? Math.max(0, planQuotaMax - planQuotaUsed) : 0;
  const planRemainingPercent =
    planQuotaMax > 0 && planRemaining > 0
      ? Math.min(100, (planRemaining / planQuotaMax) * 100)
      : 0;

  return (
    <Card className="min-h-115">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="space-y-4">
          <span className="block font-semibold text-xl">
            {formatCurrency(priceCop)}
          </span>
          <span className="block text-pretty text-muted-foreground text-sm">
            Estos créditos se consumen después de los que tienes incluidos en tu
            plan.
          </span>
        </div>

        <div className="space-y-8">
          {isUnlimitedPlan ? (
            <span className="text-muted-foreground text-sm">
              {planLabel}: ilimitado
            </span>
          ) : (
            <Progress value={planRemainingPercent}>
              <ProgressLabel>{planLabel}</ProgressLabel>
              <ProgressValue>
                {() => `${planRemaining} / ${planQuotaMax}`}
              </ProgressValue>
            </Progress>
          )}

          {hasCredits && (
            <Progress value={percentage}>
              <ProgressLabel>WhatsApp extra restantes</ProgressLabel>
              <ProgressValue>{() => `${currentCredits}`}</ProgressValue>
            </Progress>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <CheckoutLink
            polarApi={{
              generateCheckoutLink: api.polar.generateCheckoutLink,
            }}
            productIds={[productId]}
            metadata={{
              barbershopId,
              ...(workosOrganizationId ? { workosOrganizationId } : {}),
            }}
            className={cn(buttonVariants({ className: "w-full" }))}
            lazy
            locale="es-CO"
          >
            Comprar créditos
          </CheckoutLink>
        )}
      </CardFooter>
    </Card>
  );
};

function getCopPrice(
  product:
    | { prices: Array<{ priceCurrency?: string; priceAmount?: number }> }
    | undefined,
) {
  if (!product) return 0;

  const copPrice = product.prices.find((p) => p.priceCurrency === "cop");

  return (copPrice?.priceAmount ?? 0) / 100;
}

interface ExtraCreditsCardsProps {
  barbershopId: Barbershop["_id"];
  workosOrganizationId?: Barbershop["workosOrganizationId"];
}

export const ExtraCreditsCards: FC<ExtraCreditsCardsProps> = ({
  barbershopId,
  workosOrganizationId,
}) => {
  const { data: products, isLoading: productsLoading } =
    useConfiguredProducts();
  const { data: credits, isLoading: creditsLoading } = useExtraCredits();
  const { data: quota } = useBarbershopQuotaUsage(barbershopId);

  const isLoading = productsLoading || creditsLoading;

  const whatsappProduct = products?.extraWhatsApp ?? undefined;

  const safeCredits: ExtraCredits | null = credits ?? null;

  // Use the cumulative purchased total as the progress-bar ceiling so the bar
  // accurately reflects depletion across all purchases (not just one pack).
  const whatsappMax = safeCredits?.whatsappPurchasedTotal ?? 0;

  if (!whatsappProduct) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {quota && (
        <CreditCard
          productId={whatsappProduct.id}
          name={whatsappProduct.name}
          description={
            whatsappProduct.description ?? "Créditos de WhatsApp adicionales"
          }
          priceCop={getCopPrice(whatsappProduct)}
          currentCredits={safeCredits?.whatsappCredits ?? 0}
          maxCredits={whatsappMax}
          barbershopId={barbershopId}
          workosOrganizationId={workosOrganizationId}
          isLoading={isLoading}
          planQuotaUsed={quota.whatsappMessagesUsed}
          planQuotaMax={quota.maxWhatsappMessagesPerMonth ?? 0}
        />
      )}
    </div>
  );
};
