import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
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
import {
  useBarbershopQuotaUsage,
  useExtraCredits,
} from "@/hooks/billing/use-credits";
import { useConfiguredProducts } from "@/hooks/billing/use-pricing";
import { cn, formatCurrency } from "@/lib/utils";

function getCopPrice(product: {
  prices: Array<{ priceCurrency?: string; priceAmount?: number }>;
}) {
  const copPrice = product.prices.find((p) => p.priceCurrency === "cop");

  return (copPrice?.priceAmount ?? 0) / 100;
}

interface WhatsAppCreditsCardProps {
  barbershopId: Barbershop["_id"];
}

/** The only purchasable credit pack: extra WhatsApp messages. */
export const WhatsAppCreditsCard: FC<WhatsAppCreditsCardProps> = ({
  barbershopId,
}) => {
  const { data: products } = useConfiguredProducts();
  const { data: credits } = useExtraCredits();
  const { data: quota } = useBarbershopQuotaUsage(barbershopId);

  // Keyed by the stable catalog key — a product rename in the Polar
  // dashboard cannot hide the purchase card.
  const product = products.extraWhatsApp;

  if (!product || !quota) {
    return null;
  }

  const currentCredits = credits?.whatsappCredits ?? 0;
  // Cumulative purchased total as the progress-bar ceiling so the bar
  // reflects depletion across all purchases (not just one pack).
  const maxCredits = credits?.whatsappPurchasedTotal ?? 0;
  const hasCredits = currentCredits > 0;
  const percentage = maxCredits > 0 ? (currentCredits / maxCredits) * 100 : 0;

  const planQuotaMax = quota.maxWhatsAppPerMonth ?? 0;
  // `null` means unlimited; a 0-quota tier is a real (empty) allowance.
  const isUnlimitedPlan = quota.maxWhatsAppPerMonth === null;
  const planRemaining =
    planQuotaMax > 0 ? Math.max(0, planQuotaMax - quota.whatsappUsed) : 0;
  const planRemainingPercent =
    planQuotaMax > 0 && planRemaining > 0
      ? Math.min(100, (planRemaining / planQuotaMax) * 100)
      : 0;

  return (
    <Card className="min-h-115">
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>
          {product.description ?? "Mensajes de WhatsApp adicionales"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="space-y-4">
          <span className="block font-semibold text-xl">
            {formatCurrency(getCopPrice(product))}
          </span>
          <span className="block text-pretty text-muted-foreground text-sm">
            Se usan cuando agotas los mensajes incluidos en tu plan.
          </span>
        </div>

        <div className="space-y-8">
          {isUnlimitedPlan ? (
            <span className="text-muted-foreground text-sm">
              Mensajes de WhatsApp incluidos: ilimitado
            </span>
          ) : (
            <Progress value={planRemainingPercent}>
              <ProgressLabel>Mensajes incluidos disponibles</ProgressLabel>
              <ProgressValue>
                {() => `${planRemaining} / ${planQuotaMax}`}
              </ProgressValue>
            </Progress>
          )}

          {hasCredits && (
            <Progress value={percentage}>
              <ProgressLabel>
                Mensajes de WhatsApp extra restantes
              </ProgressLabel>
              <ProgressValue>{() => `${currentCredits}`}</ProgressValue>
            </Progress>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <CheckoutLink
          polarApi={{
            generateCheckoutLink: api.polar.generateCheckoutLink,
          }}
          productIds={[product.id]}
          className={cn(buttonVariants({ className: "w-full" }))}
          lazy
          locale="es-CO"
        >
          Comprar créditos
        </CheckoutLink>
      </CardFooter>
    </Card>
  );
};
