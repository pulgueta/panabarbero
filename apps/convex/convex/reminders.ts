import { internalMutation } from "./_generated/server";

export const runReminderScan = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const startAtGte = now + 29 * 60 * 1000;
    const startAtLte = now + 31 * 60 * 1000;
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_startAt")
      .filter(({ gte, lte, field, and, or, eq }) =>
        and(
          gte(field("startAt"), startAtGte),
          lte(field("startAt"), startAtLte),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .collect();

    if (appointments.length === 0) return;

    const barbershops = await ctx.db.query("barbershops").collect();

    for (const barbershop of barbershops) {
      for (const appointment of appointments.filter(
        (a) => a.barbershopId === barbershop._id,
      )) {
        await ctx.db.insert("notifications", {
          uuid: crypto.randomUUID(),
          type: "sms",
          reason: "appointment_reminder",
          title: "Recordatorio de cita",
          body: `Tienes una cita en ~30 minutos en ${barbershop.name}`,
          senderUserId: "system",
          receiverUserId: appointment.userId,
          appointmentId: appointment._id,
        });
      }
    }
  },
});

export const runGraceNoShowScan = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_startAt")
      .filter(({ lte, field, or, eq, and }) =>
        and(
          lte(field("startAt"), now),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .collect();

    if (appointments.length === 0) return;

    for (const appointment of appointments) {
      const shop = await ctx.db.get(appointment.barbershopId);
      const grace = shop?.gracePeriodMinutes ?? 0;
      const cutoff = appointment.startAt + grace * 60 * 1000;
      if (Date.now() >= cutoff) {
        await ctx.db.patch(appointment._id, { status: "no-show" });
        await ctx.db.insert("notifications", {
          uuid: crypto.randomUUID(),
          type: "sms",
          reason: "appointment_no_show",
          title: "Marked as no-show",
          body: "You were marked as no-show after the grace period.",
          senderUserId: "system",
          receiverUserId: appointment.userId,
          appointmentId: appointment._id,
        });
      }
    }
  },
});
