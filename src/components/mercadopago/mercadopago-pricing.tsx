import {
  MP_FREE_PRODUCT_KEY,
  MP_PAID_PLANS,
  type MpPaidProductKey,
} from "@convex/mercadopagoPlans";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { type FC, useState } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCancelMpSubscription,
  useCreateMpCheckout,
  useMpSubscription,
  useSubscribeMpFree,
} from "@/hooks/billing/use-mercadopago";
import { useSession } from "@/hooks/use-session";
import { formatCurrency } from "@/lib/utils";

const PLAN_LABELS: Record<string, string> = {
  barberiaMonthly: "Barbería",
  barberiaYearly: "Barbería",
  barberiaProfMonthly: "Barbería Profesional",
  barberiaProfYearly: "Barbería Profesional",
  independiente: "Independiente",
};

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "success" | "warning" | "info" | "outline" }
> = {
  active: { label: "Activa", variant: "success" },
  trialing: { label: "Prueba", variant: "info" },
  pending: { label: "Pendiente", variant: "warning" },
  paused: { label: "Pausada", variant: "warning" },
  canceled: { label: "Cancelada", variant: "outline" },
};

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    typeof (error as { data: unknown }).data === "string"
  ) {
    return (error as { data: string }).data;
  }
  return "Ocurrió un error. Intenta de nuevo.";
}

interface MercadopagoPricingProps {
  /** `?status=success` after returning from the MercadoPago checkout. */
  statusParam?: string;
}

export const MercadopagoPricing: FC<MercadopagoPricingProps> = ({
  statusParam,
}) => {
  const { data: session } = useSession();
  const { data: subscription } = useMpSubscription();
  const createCheckout = useCreateMpCheckout();
  const cancel = useCancelMpSubscription();
  const subscribeFree = useSubscribeMpFree();

  const [payerEmail, setPayerEmail] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isAuthed = !!session?.id;
  const activeProductKey =
    subscription?.status === "active" || subscription?.status === "trialing"
      ? subscription?.productKey
      : undefined;
  const canCancel =
    !!subscription?.preapprovalId &&
    (subscription?.status === "active" ||
      subscription?.status === "paused" ||
      subscription?.status === "pending");

  async function handleSubscribe(productKey: MpPaidProductKey) {
    setPendingKey(productKey);
    try {
      const result = await createCheckout.mutateAsync({
        productKey,
        payerEmail: payerEmail.trim() || undefined,
      });
      window.location.href = result.initPoint;
    } catch (error) {
      toast.error(getErrorMessage(error));
      setPendingKey(null);
    }
  }

  async function handleFree() {
    setPendingKey(MP_FREE_PRODUCT_KEY);
    try {
      await subscribeFree.mutateAsync({});
      toast.success("Plan gratis activado.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleCancel() {
    try {
      await cancel.mutateAsync({});
      toast.success("Suscripción cancelada.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {statusParam === "success" ? (
        <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-info text-sm">
          Estamos confirmando tu pago con MercadoPago. Tu plan se activará
          automáticamente en unos segundos.
        </div>
      ) : null}

      {subscription?.status ? (
        <Card size="sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Tu suscripción</p>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight">
                  {PLAN_LABELS[subscription.productKey ?? ""] ?? "—"}
                </span>
                <Badge
                  variant={
                    STATUS_BADGE[subscription.status]?.variant ?? "outline"
                  }
                >
                  {STATUS_BADGE[subscription.status]?.label ??
                    subscription.status}
                </Badge>
              </div>
            </div>
            {canCancel ? (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancel.isPending}
              >
                {cancel.isPending ? "Cancelando…" : "Cancelar suscripción"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isAuthed ? (
        <div className="grid max-w-md gap-1.5">
          <Label htmlFor="mp-payer-email">
            Correo del pagador (opcional, para pruebas)
          </Label>
          <Input
            id="mp-payer-email"
            type="email"
            placeholder="test_user_123@testuser.com"
            value={payerEmail}
            onChange={(event) => setPayerEmail(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            En sandbox usa un comprador de prueba. Si lo dejas vacío se usa el
            correo de tu cuenta.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Free plan */}
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Independiente</CardTitle>
            <CardDescription>
              Lo esencial para empezar a recibir citas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2">
            <span className="font-semibold text-3xl">Gratis</span>
          </CardContent>
          <CardFooter>
            {!isAuthed ? (
              <Button
                nativeButton={false}
                className="w-full"
                render={<Link to="/login" />}
              >
                Iniciar sesión
              </Button>
            ) : activeProductKey === MP_FREE_PRODUCT_KEY ? (
              <Badge variant="success" className="w-full justify-center py-2">
                <CheckCircleIcon />
                Plan actual
              </Badge>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleFree}
                disabled={pendingKey === MP_FREE_PRODUCT_KEY}
              >
                {pendingKey === MP_FREE_PRODUCT_KEY
                  ? "Activando…"
                  : "Activar plan gratis"}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Paid plans */}
        {MP_PAID_PLANS.map((plan) => {
          const isCurrent = activeProductKey === plan.productKey;
          const isPending = pendingKey === plan.productKey;

          return (
            <Card key={plan.productKey} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{PLAN_LABELS[plan.productKey]}</CardTitle>
                <CardDescription>
                  {plan.interval === "year"
                    ? "Facturación anual"
                    : "Facturación mensual"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-1">
                <div className="flex items-end gap-2">
                  <span className="font-semibold text-3xl">
                    {formatCurrency(plan.amountCop)}
                  </span>
                  <span className="pb-1 text-muted-foreground text-sm">
                    {plan.interval === "year" ? "/ año" : "/ mes"}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                {!isAuthed ? (
                  <Button
                    nativeButton={false}
                    className="w-full"
                    render={<Link to="/login" />}
                  >
                    Iniciar sesión
                  </Button>
                ) : isCurrent ? (
                  <Badge
                    variant="success"
                    className="w-full justify-center py-2"
                  >
                    <CheckCircleIcon />
                    Plan actual
                  </Badge>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.productKey)}
                    disabled={isPending || createCheckout.isPending}
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
