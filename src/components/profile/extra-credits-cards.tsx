import { CheckoutLink } from "@convex-dev/polar/react";
import { CREDITS_PER_PURCHASE } from "@convex/plans";
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

  const planRemaining =
    planQuotaMax > 0 ? Math.max(0, planQuotaMax - planQuotaUsed) : 0;
  const planRemainingPercent =
    planQuotaMax > 0 && planRemaining > 0
      ? Math.min(100, (planRemaining / planQuotaMax) * 100)
      : 0;

  return (
    <Card>
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

          <Progress value={planRemainingPercent}>
            <ProgressLabel>{planLabel}</ProgressLabel>
            <ProgressValue>
              {() => `${planRemaining} / ${planQuotaMax}`}
            </ProgressValue>
          </Progress>
        </div>

        {hasCredits && (
          <Progress value={percentage}>
            <ProgressLabel>
              {planQuotaKind === "sms" ? "SMS" : "Correos"} extra restantes
            </ProgressLabel>
            <ProgressValue>{() => `${currentCredits}`}</ProgressValue>
          </Progress>
        )}
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

  // Track the highest balance ever seen to set the max on the progress bar.
  // We use the per-purchase amount as max when the user has bought exactly once,
  // or the current balance when they've stacked multiple purchases.
  const smsMax = Math.max(
    safeCredits?.smsCredits ?? 0,
    CREDITS_PER_PURCHASE.extraSms,
  );
  const emailMax = Math.max(
    safeCredits?.emailCredits ?? 0,
    CREDITS_PER_PURCHASE.extraEmails,
  );

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
