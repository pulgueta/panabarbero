/**
 * Dashboard analytics for the "Analíticas" management section (owner + staff).
 *
 * Two read shapes, two strategies:
 *   - Long-range trends read `completedAppointmentsAggregate` (count = citas,
 *     sum = estimated revenue snapshotted at completion) in O(log n) per month.
 *   - The recent-window breakdown scans `by_barbershopId_and_date` over the
 *     last 90 days and groups in memory — same tradeoff the reviews histogram
 *     took (dashboard brief, locked decision 2) to avoid extra dual-writes.
 */

import { z } from "zod";

import { zAuthQuery } from ".";
import { completedAppointmentsAggregate } from "./aggregates";
import { assertShopRole } from "./authz";
import type { BarbershopMember, Service } from "./schema";
import { barbershops } from "./schema";
import { colombiaDateKeyToMs, toColombiaDateKey } from "./utils";

const TREND_MONTHS = 6;
const BREAKDOWN_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Completed citas + estimated revenue per Bogotá month for the last 6 months,
 * read entirely from the aggregate. Revenue is the service price snapshotted
 * when each cita was completed (COP integer pesos).
 */
export const getAppointmentsTrend = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const barbershopId = args.barbershop.id;

    await assertShopRole(ctx, barbershopId, userId, ["owner", "staff"]);

    // Current Bogotá month, then walk back to build the last 6 month keys.
    const currentMonth = toColombiaDateKey(Date.now()).slice(0, 7);
    const [currentYear, currentMonthNumber] = currentMonth
      .split("-")
      .map(Number);
    const baseMonthIndex = currentYear * 12 + (currentMonthNumber - 1);

    const monthKeys: string[] = [];

    for (let offset = TREND_MONTHS - 1; offset >= 0; offset--) {
      const monthIndex = baseMonthIndex - offset;
      const year = Math.floor(monthIndex / 12);
      const monthNumber = (monthIndex % 12) + 1;

      monthKeys.push(`${year}-${String(monthNumber).padStart(2, "0")}`);
    }

    return await Promise.all(
      monthKeys.map(async (month) => {
        const [year, monthNumber] = month.split("-").map(Number);
        const nextMonth =
          monthNumber === 12
            ? `${year + 1}-01`
            : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;

        const bounds = {
          lower: {
            key: colombiaDateKeyToMs(`${month}-01`),
            inclusive: true as const,
          },
          upper: {
            key: colombiaDateKeyToMs(`${nextMonth}-01`),
            inclusive: false as const,
          },
        };

        const [completed, revenue] = await Promise.all([
          completedAppointmentsAggregate.count(ctx, {
            namespace: barbershopId,
            bounds,
          }),
          completedAppointmentsAggregate.sum(ctx, {
            namespace: barbershopId,
            bounds,
          }),
        ]);

        return { month, completed, revenue };
      }),
    );
  },
});

/**
 * Last-90-days operational breakdown: per barber, per service and per Bogotá
 * weekday, plus window totals. One index scan bounded on both sides (since ≤
 * date ≤ now — future-dated bookings can never be `completed`/`no-show`, so
 * the upper bound only trims the scan), grouped in memory; revenue and service
 * name come from the completion-time snapshot on each row (falling back to the
 * live service, then 0 / "Servicio"), so a service deleted after the fact still
 * counts. Cancelled citas are hard-deleted, so only `completed` and `no-show`
 * rows survive to be counted.
 */
export const getOperationsBreakdown = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const barbershopId = args.barbershop.id;

    await assertShopRole(ctx, barbershopId, userId, ["owner", "staff"]);

    const now = Date.now();
    const since = now - BREAKDOWN_DAYS * DAY_MS;

    const [rows, services] = await Promise.all([
      ctx.db
        .query("appointments")
        .withIndex("by_barbershopId_and_date", (q) =>
          q.eq("barbershopId", barbershopId).gte("date", since).lte("date", now),
        )
        .collect(),
      ctx.db
        .query("services")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
    ]);

    const serviceById = new Map<Service["_id"], Service>(
      services.map((service) => [service._id, service]),
    );

    const perBarber = new Map<
      BarbershopMember["_id"],
      { completed: number; revenue: number }
    >();
    const perService = new Map<
      Service["_id"],
      { completed: number; revenue: number; name: string }
    >();
    // Indexed by JS `getUTCDay()` of the Bogotá calendar date (0 = domingo).
    const byWeekday = Array.from({ length: 7 }, () => 0);
    const totals = { completed: 0, noShows: 0, revenue: 0 };

    for (const appointment of rows) {
      if (appointment.deletedAt !== undefined) {
        continue;
      }

      if (appointment.status === "no-show") {
        totals.noShows += 1;
        continue;
      }

      if (appointment.status !== "completed") {
        continue;
      }

      const liveService = serviceById.get(appointment.serviceId);
      const price =
        appointment.completedServicePrice ?? liveService?.price ?? 0;
      const serviceName =
        appointment.completedServiceName ?? liveService?.name ?? "Servicio";

      totals.completed += 1;
      totals.revenue += price;

      const barber = perBarber.get(appointment.barbershopMemberId) ?? {
        completed: 0,
        revenue: 0,
      };
      barber.completed += 1;
      barber.revenue += price;
      perBarber.set(appointment.barbershopMemberId, barber);

      const service = perService.get(appointment.serviceId) ?? {
        completed: 0,
        revenue: 0,
        name: serviceName,
      };
      service.completed += 1;
      service.revenue += price;
      // A concrete (snapshot or live) name beats the "Servicio" fallback, so a
      // deleted service still labels correctly if any of its rows carries one.
      if (service.name === "Servicio" && serviceName !== "Servicio") {
        service.name = serviceName;
      }
      perService.set(appointment.serviceId, service);

      const [year, month, day] = toColombiaDateKey(appointment.date)
        .split("-")
        .map(Number);
      byWeekday[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] += 1;
    }

    // Resolve barber display names once per member.
    const barbers = await Promise.all(
      Array.from(perBarber.entries()).map(async ([memberId, stats]) => {
        const member = await ctx.db.get(memberId);
        const profile = member
          ? await ctx.db.get(member.userProfileDataId)
          : null;

        return {
          barbershopMemberId: memberId,
          name: profile?.name ?? "Barbero",
          ...stats,
        };
      }),
    );

    return {
      days: BREAKDOWN_DAYS,
      totals,
      perBarber: barbers.sort((a, b) => b.completed - a.completed),
      perService: Array.from(perService.entries())
        .map(([serviceId, stats]) => ({
          serviceId,
          ...stats,
        }))
        .sort((a, b) => b.completed - a.completed),
      byWeekday,
    };
  },
});
