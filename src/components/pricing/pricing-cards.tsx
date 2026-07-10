import type { MpPaidProductKey } from "@convex/mercadopagoPlans";
import {
  getMpPlan,
  isMpPaidProductKey,
  MP_FREE_PRODUCT_KEY,
} from "@convex/mercadopagoPlans";
import type { PlanTier } from "@convex/plans";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CancelSubscriptionDialog,
  MP_SUBSCRIPTIONS_URL,
} from "@/components/pricing/cancel-subscription-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlanBenefits } from "@/config/plan-benefits";
import {
  useCreateMpCheckout,
  useMpSubscription,
  useSubscribeMpFree,
} from "@/hooks/billing/use-mercadopago";
import { useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { cn, formatCurrency } from "@/lib/utils";

type Interval = "month" | "year";

interface TierConfig {
  tier: PlanTier;
  name: string;
  description: string;
  /** Paid tiers map to a product key per billing interval; Free has neither. */
  monthly?: MpPaidProductKey;
  yearly?: MpPaidProductKey;
}

const TIERS: TierConfig[] = [
  {
    tier: "premium",
    name: "Barbería Profesional",
    description:
      "Todo el potencial de tu barbería: barberos ilimitados, PanaAI e inventario.",
    monthly: "barberiaProfMonthly",
    yearly: "barberiaProfYearly",
  },
  {
    tier: "pro",
    name: "Barbería",
    description:
      "Gestiona tu barbería con más barberos, PanaAI e inventario incluidos.",
    monthly: "barberiaMonthly",
    yearly: "barberiaYearly",
  },
  {
    tier: "free",
    name: "Independiente",
    description: "Lo esencial para empezar a recibir citas.",
  },
];

/**
 * MercadoPago-backed pricing cards for `/pricing`. Renders the three tiers with
 * a monthly/yearly toggle, benefits from the local catalog, and buttons wired
 * to the MercadoPago hooks. Access is never granted from the redirect — the
 * webhook activates the plan.
 */
export const PricingCards: FC = () => {
  const { data: session } = useSession();
  const { data: subscription } = useMpSubscription();
  const { mutateAsync: createCheckout, isPending: isCreatingCheckout } =
    useCreateMpCheckout();
  const { mutateAsync: subscribeFree, isPending: isSubscribingFree } =
    useSubscribeMpFree();

  const [intervalChoice, setIntervalChoice] = useState<Interval | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isAuthed = !!session?.id;
  const activeProductKey =
    subscription?.status === "active" || subscription?.status === "trialing"
      ? subscription?.productKey
      : undefined;

  // A preapproval that is authorized or paused at MercadoPago can still bill
  // (or be reactivated), so every plan-switch path stays closed while one
  // exists: the server refuses new checkouts and the UI points to the
  // explicit, confirmed cancel instead. `livePaid` comes from its own
  // resolver — a paused paid row is shadowed by the active free row in the
  // effective subscription and would be invisible here otherwise.
  const livePaid = subscription?.livePaid ?? null;

  // Default the toggle to the live subscription's billing interval so a
  // yearly subscriber lands on the view that shows their cancel controls
  // instead of having to discover the "Anual" tab first.
  const livePaidKey = livePaid?.productKey;
  const liveInterval = isMpPaidProductKey(livePaidKey)
    ? getMpPlan(livePaidKey).interval
    : undefined;
  const interval = intervalChoice ?? liveInterval ?? "month";

  async function handleSubscribe(productKey: MpPaidProductKey) {
    setPendingKey(productKey);
    try {
      const result = await createCheckout({ productKey });
      if (!result.initPoint) {
        throw new Error("No se recibió la URL de checkout de MercadoPago.");
      }
      window.location.href = result.initPoint;
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      setPendingKey(null);
    }
  }

  async function handleFree() {
    setPendingKey(MP_FREE_PRODUCT_KEY);
    try {
      await subscribeFree({});
      toast.success("Plan gratis activado.");
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1">
        {(["month", "year"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            onClick={() => setIntervalChoice(value)}
            className={cn(
              "rounded-md px-4 py-1.5 font-medium text-sm transition-colors",
              interval === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "month" ? "Mensual" : "Anual"}
          </button>
        ))}
      </div>

      <div className="grid w-full gap-4 md:grid-cols-3">
        {TIERS.map((t) => {
          const isFree = t.tier === "free";
          const productKey = isFree
            ? undefined
            : interval === "year"
              ? t.yearly
              : t.monthly;
          const plan = productKey ? getMpPlan(productKey) : undefined;
          const benefits = getPlanBenefits(t.tier);
          const isCurrent = isFree
            ? activeProductKey === MP_FREE_PRODUCT_KEY
            : !!productKey && activeProductKey === productKey;
          const isPending = pendingKey === (productKey ?? MP_FREE_PRODUCT_KEY);
          const isLivePaidCard =
            !!productKey && livePaid?.productKey === productKey;

          return (
            <Card key={t.tier} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-end gap-2">
                  <span className="font-semibold text-3xl">
                    {isFree || !plan
                      ? "Gratis"
                      : formatCurrency(plan.amountCop)}
                  </span>
                  {!isFree && (
                    <span className="pb-1 text-muted-foreground text-sm">
                      {interval === "year" ? "/ año" : "/ mes"}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 text-sm">
                  {benefits.map((benefit) => (
                    <li
                      key={benefit.label}
                      className={cn(
                        "flex items-center gap-x-1.5",
                        benefit.included
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {benefit.included ? (
                        <CheckCircleIcon
                          className="shrink-0 text-primary"
                          size={16}
                        />
                      ) : (
                        <XCircleIcon
                          className="shrink-0 text-muted-foreground/50"
                          size={16}
                        />
                      )}
                      <span>{benefit.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {!isAuthed ? (
                  <Button
                    nativeButton={false}
                    className="w-full"
                    render={<Link to="/login" />}
                  >
                    Iniciar sesión para adquirir plan
                  </Button>
                ) : isLivePaidCard ? (
                  <div className="flex w-full flex-col items-center gap-2">
                    {livePaid?.status === "paused" && (
                      <p className="text-center text-muted-foreground text-xs">
                        Tu suscripción está pausada en MercadoPago.
                      </p>
                    )}
                    <CancelSubscriptionDialog
                      planName={t.name}
                      trigger={
                        <Button variant="outline" className="w-full">
                          Cancelar suscripción
                        </Button>
                      }
                    />
                    <a
                      href={MP_SUBSCRIPTIONS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                    >
                      Gestionar en MercadoPago
                    </a>
                  </div>
                ) : isCurrent ? (
                  <Badge
                    variant="success"
                    className="w-full justify-center py-2"
                  >
                    <CheckCircleIcon />
                    Plan actual
                  </Badge>
                ) : livePaid ? (
                  <p className="w-full rounded-lg border border-dashed px-3 py-2 text-center text-muted-foreground text-sm">
                    {isFree
                      ? "Cancela tu suscripción para volver al plan gratis."
                      : "Cancela tu plan actual para cambiar de plan."}
                  </p>
                ) : isFree ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleFree}
                    disabled={isPending || isSubscribingFree}
                  >
                    {isSubscribingFree ? "Activando…" : "Activar plan gratis"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => productKey && handleSubscribe(productKey)}
                    disabled={isCreatingCheckout}
                  >
                    {isPending ? "Redirigiendo…" : "Suscribirse"}
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
