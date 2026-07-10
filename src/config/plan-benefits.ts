import type { PlanTier } from "@convex/plans";
import { PLAN_LIMITS } from "@convex/plans";

export interface PlanBenefit {
  label: string;
  /** `false` renders a muted row with a cross icon (e.g. "No incluye PanaAI"). */
  included: boolean;
}

const numberFmt = new Intl.NumberFormat("es-CO");

/**
 * Pricing-card benefits for a tier, derived from the single source of truth
 * (`PLAN_LIMITS`) plus a few static marketing rows. Keeping this a derivation
 * means a change to `PLAN_LIMITS` (barbers/staff/quotas) updates the pricing
 * cards automatically — no second list to keep in sync.
 *
 * PanaAI and inventory are emitted as explicit included/excluded rows so Free
 * shows "No incluye PanaAI" / "No incluye inventario" instead of silently
 * omitting them.
 */
export function getPlanBenefits(tier: PlanTier): PlanBenefit[] {
  const limits = PLAN_LIMITS[tier];
  const benefits: PlanBenefit[] = [];

  benefits.push({
    label:
      limits.maxInvitedBarbers === null
        ? "Barberos ilimitados"
        : `Invita hasta ${limits.maxInvitedBarbers} barberos`,
    included: true,
  });

  if (limits.maxStaff === null) {
    benefits.push({ label: "Recepcionistas ilimitados", included: true });
  } else if (limits.maxStaff > 0) {
    benefits.push({
      label: `Hasta ${limits.maxStaff} ${
        limits.maxStaff === 1 ? "recepcionista" : "recepcionistas"
      }`,
      included: true,
    });
  }

  benefits.push({ label: "Personaliza tu perfil de barbería", included: true });
  benefits.push({
    label: "Recibe notificaciones de tus clientes",
    included: true,
  });

  if (limits.staffCanCreateAppointments) {
    benefits.push({ label: "Crea citas por tus clientes", included: true });
  }

  benefits.push({
    label:
      limits.maxSmsPerMonth === null
        ? "SMS ilimitados por mes"
        : `Hasta ${numberFmt.format(limits.maxSmsPerMonth)} SMS por mes`,
    included: true,
  });
  benefits.push({
    label:
      limits.maxEmailPerMonth === null
        ? "Correos ilimitados por mes"
        : `Hasta ${numberFmt.format(limits.maxEmailPerMonth)} correos por mes`,
    included: true,
  });

  benefits.push({
    label: limits.panaManagement ? "Incluye PanaAI" : "No incluye PanaAI",
    included: limits.panaManagement,
  });
  benefits.push({
    label: limits.inventoryEnabled
      ? "Módulo de inventario"
      : "No incluye inventario",
    included: limits.inventoryEnabled,
  });

  benefits.push({
    label: tier === "free" ? "Soporte estándar" : "Soporte prioritario",
    included: true,
  });

  return benefits;
}
