import { CheckoutLink } from "@convex-dev/polar/react";
import type { Barbershop, ExtraCredits } from "@convex/schema";
import { api } from "convex/_generated/api";
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
import { usePricingPlans } from "@/hooks/billing/use-pricing";
import { cn, formatCurrency } from "@/lib/utils";

interface CreditCardProps {
  productId: string;
  name: string;
  description: string;
  priceCop: number;
  currentCredits: number;
  maxCredits: number;
  barbershopId: string;
  isLoading: boolean;
  planQuotaUsed: number;
  planQuotaMax: number;
  planQuotaKind: "sms" | "email";
}

const CreditCard: FC<CreditCardProps> = ({
  productId,
  name,
  description,
  priceCop,
  currentCredits,
  maxCredits,
  barbershopId,
  isLoading,
  planQuotaUsed,
  planQuotaMax,
  planQuotaKind,
}) => {
  const hasCredits = currentCredits > 0;
  const percentage = maxCredits > 0 ? (currentCredits / maxCredits) * 100 : 0;

  const planLabel =
    planQuotaKind === "sms" ? "SMS incluidos" : "Correos incluidos";

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
            Estos créditos se consumen después de los que tienes incluídos en tu
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
              <ProgressLabel>
                {planQuotaKind === "sms" ? "SMS" : "Correos"} extra restantes
              </ProgressLabel>
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
            metadata={{ barbershopId }}
            className={cn(buttonVariants({ className: "w-full" }))}
            lazy
          >
            Comprar créditos
          </CheckoutLink>
        )}
      </CardFooter>
    </Card>
  );
};

interface ExtraCreditsCardsProps {
  barbershopId: Barbershop["_id"];
}

export const ExtraCreditsCards: FC<ExtraCreditsCardsProps> = ({
  barbershopId,
}) => {
  const { data: products, isLoading: productsLoading } = usePricingPlans();
  const { data: credits, isLoading: creditsLoading } = useExtraCredits();
  const { data: quota } = useBarbershopQuotaUsage(barbershopId);

  const isLoading = productsLoading || creditsLoading;

  // Find the one-time credit products
  const smsProduct = products?.find(
    (p) => !p.isRecurring && p.name.toLowerCase().includes("sms"),
  );
  const emailProduct = products?.find(
    (p) => !p.isRecurring && p.name.toLowerCase().includes("correo"),
  );

  const getCopPrice = (
    product:
      | { prices: Array<{ priceCurrency?: string; priceAmount?: number }> }
      | undefined,
  ) => {
    if (!product) return 0;

    const copPrice = product.prices.find((p) => p.priceCurrency === "cop");

    return (copPrice?.priceAmount ?? 0) / 100;
  };

  const safeCredits: ExtraCredits | null = credits ?? null;

  // Use the cumulative purchased total as the progress-bar ceiling so the bar
  // accurately reflects depletion across all purchases (not just one pack).
  const smsMax = safeCredits?.smsPurchasedTotal ?? 0;
  const emailMax = safeCredits?.emailPurchasedTotal ?? 0;

  if (!smsProduct && !emailProduct) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {smsProduct && quota && (
        <CreditCard
          productId={smsProduct.id}
          name={smsProduct.name}
          description={smsProduct.description ?? "Créditos de SMS adicionales"}
          priceCop={getCopPrice(smsProduct)}
          currentCredits={safeCredits?.smsCredits ?? 0}
          maxCredits={smsMax}
          barbershopId={barbershopId}
          isLoading={isLoading}
          planQuotaUsed={quota.smsUsed}
          planQuotaMax={quota.maxSmsPerMonth ?? 0}
          planQuotaKind="sms"
        />
      )}

      {emailProduct && quota && (
        <CreditCard
          productId={emailProduct.id}
          name={emailProduct.name}
          description={
            emailProduct.description ?? "Créditos de correo adicionales"
          }
          priceCop={getCopPrice(emailProduct)}
          currentCredits={safeCredits?.emailCredits ?? 0}
          maxCredits={emailMax}
          barbershopId={barbershopId}
          isLoading={isLoading}
          planQuotaUsed={quota.emailsUsed}
          planQuotaMax={quota.maxEmailPerMonth ?? 0}
          planQuotaKind="email"
        />
      )}
    </div>
  );
};
