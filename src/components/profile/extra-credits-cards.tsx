import { MP_CREDIT_PACK_LIST } from "@convex/mercadopagoPlans";
import type { CreditProductKey } from "@convex/plans";
import type { Barbershop } from "@convex/schema";
import { type FC, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  useBarbershopQuotaUsage,
  useExtraCredits,
} from "@/hooks/billing/use-credits";
import { useCreateMpCreditCheckout } from "@/hooks/billing/use-mercadopago";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { formatCurrency } from "@/lib/utils";

interface CreditCardProps {
  productKey: CreditProductKey;
  name: string;
  description: string;
  priceCop: number;
  currentCredits: number;
  maxCredits: number;
  barbershopId: string;
  planQuotaUsed: number;
  planQuotaMax: number;
  planQuotaKind: "sms" | "email";
}

const CreditCard: FC<CreditCardProps> = ({
  productKey,
  name,
  description,
  priceCop,
  currentCredits,
  maxCredits,
  barbershopId,
  planQuotaUsed,
  planQuotaMax,
  planQuotaKind,
}) => {
  const { mutateAsync: createCheckout, isPending } =
    useCreateMpCreditCheckout();
  const [redirecting, setRedirecting] = useState(false);

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

  async function handleBuy() {
    setRedirecting(true);
    try {
      const result = await createCheckout({ productKey, barbershopId });
      if (!result.initPoint) {
        throw new Error("No se recibió la URL de checkout de Mercado Pago.");
      }
      window.location.href = result.initPoint;
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      setRedirecting(false);
    }
  }

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
        <Button
          className="w-full"
          onClick={handleBuy}
          disabled={isPending || redirecting}
        >
          {redirecting ? "Redirigiendo…" : "Comprar créditos"}
        </Button>
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
  const { data: credits } = useExtraCredits();
  const { data: quota } = useBarbershopQuotaUsage(barbershopId);

  if (!quota) {
    return null;
  }

  // The cumulative purchased total is the progress-bar ceiling so the bar
  // reflects depletion across all purchases (not just the latest pack).
  const smsMax = credits?.smsPurchasedTotal ?? 0;
  const emailMax = credits?.emailPurchasedTotal ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {MP_CREDIT_PACK_LIST.map((pack) => {
        const isSms = pack.type === "sms";

        return (
          <CreditCard
            key={pack.productKey}
            productKey={pack.productKey}
            name={pack.title}
            description={pack.description}
            priceCop={pack.amountCop}
            currentCredits={
              isSms ? (credits?.smsCredits ?? 0) : (credits?.emailCredits ?? 0)
            }
            maxCredits={isSms ? smsMax : emailMax}
            barbershopId={barbershopId}
            planQuotaUsed={isSms ? quota.smsUsed : quota.emailsUsed}
            planQuotaMax={
              (isSms ? quota.maxSmsPerMonth : quota.maxEmailPerMonth) ?? 0
            }
            planQuotaKind={pack.type}
          />
        );
      })}
    </div>
  );
};
