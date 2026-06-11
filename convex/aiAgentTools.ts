import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

type AppointmentDoc = Doc<"appointments">;
type BarbershopDoc = Doc<"barbershops">;
type BarbershopMemberDoc = Doc<"barbershopMembers">;
type ReviewDoc = Doc<"reviews">;
type ServiceDoc = Doc<"services">;
type AvailabilityEntry = BarbershopDoc["availability"][number];
type BarberWithName = BarbershopMemberDoc & { name: string };
type Slot = { time: string; minutes: number };

const ANON_PREFIX = "anon:";

function requireAuthUserId(userId: string | undefined): string {
  if (!userId || userId.startsWith(ANON_PREFIX)) {
    throw new Error(
      "Necesitas iniciar sesión para hacer esta acción. Pídele al usuario que inicie sesión en PanaBarbero.",
    );
  }

  return userId;
}

const proposalKind = "needs-confirmation" as const;

const bookProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("book"),
  summary: z.string(),
  args: z.object({
    barbershopId: z.string(),
    serviceId: z.string(),
    barbershopMemberId: z.string(),
    date: z.number(),
    customerName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const cancelProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("cancel"),
  summary: z.string(),
  args: z.object({
    appointmentId: z.string(),
    reason: z.string(),
  }),
});

const rescheduleProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("reschedule"),
  summary: z.string(),
  args: z.object({
    appointmentId: z.string(),
    proposedDate: z.number(),
  }),
});

export const ProposalSchema = z.discriminatedUnion("action", [
  bookProposal,
  cancelProposal,
  rescheduleProposal,
]);

export type Proposal = z.infer<typeof ProposalSchema>;

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

const priceFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Bogota",
});

const formatDate = (ms: number): string => dateFormatter.format(new Date(ms));

const formatPrice = (cop: number): string => priceFormatter.format(cop);

// ---------------------------------------------------------------------------
// READ TOOLS
// ---------------------------------------------------------------------------

const searchBarbershops = createTool({
  description:
    "Busca barberías activas en PanaBarbero. Úsala cuando el usuario quiera encontrar barberías por nombre, ciudad o departamento. Devuelve nombre, dirección, ciudad y uuid (necesario para otras consultas).",
  inputSchema: z.object({
    name: z
      .string()
      .optional()
      .describe("Texto parcial del nombre de la barbería (opcional)"),
    city: z.string().optional().describe("Ciudad (opcional)"),
    state: z.string().optional().describe("Departamento (opcional)"),
  }),
  execute: async (ctx, input) => {
    const results = (await ctx.runQuery(api.barbershops.getByName, {
      name: input.name,
      city: input.city,
      state: input.state,
    })) as BarbershopDoc[];

    return results.slice(0, 10).map((shop: BarbershopDoc) => ({
      uuid: shop.uuid,
      name: shop.name,
      address: shop.address.fullAddress,
      city: shop.city,
      state: shop.state,
      description: shop.description,
    }));
  },
});

const getBarbershopDetails = createTool({
  description:
    "Obtiene los detalles de una barbería: servicios, horario semanal y datos de contacto. Pásale el uuid devuelto por `searchBarbershops`.",
  inputSchema: z.object({
    barbershopUuid: z.uuidv4().describe("UUID público de la barbería"),
  }),
  execute: async (ctx, input) => {
    const shop = (await ctx.runQuery(api.barbershops.getByUuid, {
      uuid: input.barbershopUuid,
    })) as BarbershopDoc | null;

    if (!shop) {
      return { found: false as const };
    }

    const services = (await ctx.runQuery(api.barbershops.getServices, {
      id: shop._id,
    })) as ServiceDoc[];

    return {
      found: true as const,
      barbershopId: shop._id,
      name: shop.name,
      address: shop.address.fullAddress,
      city: shop.city,
      state: shop.state,
      description: shop.description,
      contactPhone: shop.contactPhone,
      availability: shop.availability.map((a: AvailabilityEntry) => ({
        day: a.weekDay.day,
        isOpen: a.weekDay.isActive,
        openAt: a.openAt,
        closeAt: a.closeAt,
        lunchStart: a.lunchStart,
        lunchEnd: a.lunchEnd,
      })),
      services: services.map((s: ServiceDoc) => ({
        serviceId: s._id,
        name: s.name,
        price: s.price,
        priceFormatted: formatPrice(s.price),
        durationMinutes: s.duration,
      })),
    };
  },
});

const listBarbersForService = createTool({
  description:
    "Lista los barberos que ofrecen un servicio específico. Necesario antes de proponer una reserva: el `barbershopMemberId` se obtiene aquí.",
  inputSchema: z.object({
    serviceId: z
      .string()
      .describe("Id del servicio (de `getBarbershopDetails`)"),
  }),
  execute: async (ctx, input) => {
    const barbers = (await ctx.runQuery(
      api.barbershopMemberServices.getBarbersForService,
      { id: input.serviceId as Id<"services"> },
    )) as (BarberWithName | null)[];

    return barbers.flatMap((b) =>
      b ? [{ barbershopMemberId: b._id, name: b.name }] : [],
    );
  },
});

const getAvailability = createTool({
  description:
    "Devuelve los horarios disponibles (en formato HH:MM) para reservar con un barbero, en una fecha y un servicio determinados. Úsala SIEMPRE antes de proponer una reserva.",
  inputSchema: z.object({
    barbershopId: z.string().describe("Id interno de la barbería"),
    barbershopMemberId: z
      .string()
      .describe("Id del barbero (de `listBarbersForService`)"),
    serviceId: z.string().describe("Id del servicio"),
    dateMs: z
      .number()
      .describe(
        "Timestamp UTC en milisegundos de la fecha (cualquier hora del día funciona)",
      ),
  }),
  execute: async (ctx, input) => {
    const slots = (await ctx.runQuery(api.appointments.getAvailableSlots, {
      barbershopId: input.barbershopId as Id<"barbershops">,
      barbershopMemberId: input.barbershopMemberId as Id<"barbershopMembers">,
      serviceId: input.serviceId as Id<"services">,
      date: input.dateMs,
    })) as Slot[];

    return {
      date: formatDate(input.dateMs),
      slotsHHMM: slots.map((s: Slot) => s.time),
    };
  },
});

const getMyAppointments = createTool({
  description:
    "Devuelve las citas del usuario que está conversando: barbería, servicio, barbero, fecha y estado. Si una cita tiene una solicitud de cambio de hora pendiente, incluye la fecha propuesta. Requiere autenticación.",
  inputSchema: z.object({
    onlyUpcoming: z
      .boolean()
      .optional()
      .describe("Si es true, devuelve solo citas futuras no canceladas"),
  }),
  execute: async (ctx, input) => {
    const userId = requireAuthUserId(ctx.userId);

    const appointments = (await ctx.runQuery(
      internal.aiAgentHelpers.getAppointmentsByUserId,
      { userId, numItems: 25 },
    )) as AppointmentDoc[];

    const now = Date.now();
    const filtered: AppointmentDoc[] = input.onlyUpcoming
      ? appointments.filter(
          (a: AppointmentDoc) =>
            !a.deletedAt &&
            a.date >= now &&
            a.status !== "cancelled" &&
            a.status !== "denied",
        )
      : appointments;

    const enriched: Array<{
      appointmentId: Id<"appointments">;
      barbershop: string;
      service: string;
      barber: string;
      when: string;
      status: AppointmentDoc["status"];
      proposedWhen?: string;
    }> = [];

    const sliced = filtered.slice(0, 10);
    const enrichedData = await Promise.all(
      sliced.map(async (appt) => {
        const [shop, service, members] = await Promise.all([
          ctx.runQuery(internal.aiAgentHelpers.getBarbershop, {
            id: appt.barbershopId,
          }) as Promise<BarbershopDoc | null>,
          ctx.runQuery(api.services.getById, {
            id: appt.serviceId,
          }) as Promise<ServiceDoc | null>,
          ctx.runQuery(internal.aiAgentHelpers.getMembersByBarbershopId, {
            id: appt.barbershopId,
          }) as Promise<BarberWithName[]>,
        ]);

        const barber = members.find(
          (m: BarberWithName) => m._id === appt.barbershopMemberId,
        );

        return {
          appointmentId: appt._id,
          barbershop: shop?.name ?? "",
          service: service?.name ?? "",
          barber: barber?.name ?? "",
          when: formatDate(appt.date),
          status: appt.status,
          proposedWhen:
            appt.status === "pending" && appt.proposedDate
              ? formatDate(appt.proposedDate)
              : undefined,
        };
      }),
    );

    enriched.push(...enrichedData);

    return enriched;
  },
});

const getMyAgenda = createTool({
  description:
    "Agenda de trabajo del usuario como BARBERO: las citas que sus clientes tienen reservadas CON ÉL en su barbería (nombre del cliente, servicio, fecha y estado). Es DISTINTA de `getMyAppointments`, que son las reservas del propio usuario como CLIENTE. Úsala cuando un miembro del equipo (dueño o barbero) pregunte por su agenda, sus 'citas con clientes', 'qué tengo hoy/mañana' o sus 'citas pendientes' del negocio. Requiere sesión y un plan de pago (Barbería o Barbería Profesional).",
  inputSchema: z.object({
    onlyUpcoming: z
      .boolean()
      .optional()
      .describe("Si es true (recomendado), solo citas futuras activas"),
  }),
  execute: async (ctx, input) => {
    const userId = requireAuthUserId(ctx.userId);

    const member = (await ctx.runQuery(
      internal.aiAgentHelpers.getMemberForUserId,
      { userId },
    )) as {
      memberId: string;
      barbershopId: string;
      barbershopName: string;
      roles: Array<"owner" | "barber" | "staff">;
    } | null;

    if (!member) {
      return { isTeamMember: false as const };
    }

    const { canManage } = (await ctx.runQuery(
      internal.aiAgentHelpers.getPanaEntitlement,
      { userId },
    )) as { isShopMember: boolean; canManage: boolean };

    if (!canManage) {
      return {
        isTeamMember: true as const,
        canManage: false as const,
        barbershopName: member.barbershopName,
      };
    }

    const appointments = (await ctx.runQuery(
      internal.aiAgentHelpers.getAppointmentsByMemberId,
      { barbershopMemberId: member.memberId, numItems: 25 },
    )) as AppointmentDoc[];

    const now = Date.now();
    const activeStatuses: AppointmentDoc["status"][] = [
      "pending",
      "confirmed",
      "rescheduled",
    ];

    const onlyUpcoming = input.onlyUpcoming ?? true;
    const relevant = onlyUpcoming
      ? appointments
          .filter(
            (a) =>
              !a.deletedAt &&
              a.date >= now &&
              activeStatuses.includes(a.status),
          )
          .sort((a, b) => a.date - b.date)
      : appointments
          .filter((a) => !a.deletedAt)
          .sort((a, b) => b.date - a.date);

    const sliced = relevant.slice(0, 10);

    const serviceIds = [...new Set(sliced.map((a) => a.serviceId))];
    const serviceDocs = (await Promise.all(
      serviceIds.map((id) => ctx.runQuery(api.services.getById, { id })),
    )) as (ServiceDoc | null)[];
    const serviceNames = new Map(
      serviceDocs.flatMap((s) => (s ? [[s._id, s.name] as const] : [])),
    );

    return {
      isTeamMember: true as const,
      canManage: true as const,
      barbershopName: member.barbershopName,
      count: sliced.length,
      appointments: sliced.map((a) => ({
        customerName: a.customerName,
        service: serviceNames.get(a.serviceId) ?? "",
        when: formatDate(a.date),
        status: a.status,
        rescheduleProposedWhen:
          a.status === "pending" && a.proposedDate
            ? formatDate(a.proposedDate)
            : undefined,
      })),
    };
  },
});

const getMyProfile = createTool({
  description:
    "Devuelve el perfil del usuario autenticado (nombre, teléfono, email). Útil para precargar datos en una reserva.",
  inputSchema: z.object({}),
  execute: async (ctx) => {
    const userId = requireAuthUserId(ctx.userId);
    const profile = (await ctx.runQuery(
      internal.aiAgentHelpers.getProfileForUserId,
      { userId },
    )) as { name?: string; email: string; phoneNumber?: string } | null;

    if (!profile) {
      return { found: false as const };
    }

    return {
      found: true as const,
      name: profile.name,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
    };
  },
});

const getBarbershopReviews = createTool({
  description:
    "Lista las reseñas (calificaciones y comentarios) más recientes de una barbería.",
  inputSchema: z.object({
    barbershopUuid: z.uuidv4().describe("UUID público de la barbería"),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  execute: async (ctx, input) => {
    const shop = (await ctx.runQuery(api.barbershops.getByUuid, {
      uuid: input.barbershopUuid,
    })) as BarbershopDoc | null;

    if (!shop) {
      return { found: false as const, reviews: [] };
    }

    const reviews = (await ctx.runQuery(
      internal.aiAgentHelpers.getReviewsForBarbershop,
      { barbershopId: shop._id, limit: input.limit ?? 5 },
    )) as ReviewDoc[];

    return {
      found: true as const,
      reviews: reviews.map((r: ReviewDoc) => ({
        rating: r.rating,
        comment: r.comment,
      })),
    };
  },
});

const getMyNotifications = createTool({
  description:
    "Devuelve las notificaciones recientes del usuario: confirmaciones de cita, cancelaciones, recordatorios, solicitudes de cambio de hora e invitaciones a equipos. Úsala cuando el usuario pregunte si tiene algo nuevo, si le llegó algún aviso, o por novedades de sus citas. Requiere autenticación.",
  inputSchema: z.object({
    onlyUnread: z
      .boolean()
      .optional()
      .describe("Si es true, devuelve solo las notificaciones sin leer"),
  }),
  execute: async (ctx, input) => {
    const userId = requireAuthUserId(ctx.userId);

    const { notifications, lastRead } = (await ctx.runQuery(
      internal.aiAgentHelpers.getNotificationsByUserId,
      { userId, numItems: 10, onlyUnread: input.onlyUnread ?? false },
    )) as {
      notifications: Doc<"inAppNotifications">[];
      lastRead: number | null;
    };

    return {
      count: notifications.length,
      notifications: notifications.map((n: Doc<"inAppNotifications">) => ({
        title: n.title,
        description: n.description,
        isRead: n._creationTime <= (lastRead ?? 0),
        when: formatDate(n._creationTime),
      })),
    };
  },
});

const getBarbershopTeam = createTool({
  description:
    "Lista los barberos activos de una barbería (solo el nombre). Úsala cuando el usuario quiera saber quién atiende en una barbería antes de elegir un servicio. Si ya hay un servicio escogido, usa `listBarbersForService` en su lugar.",
  inputSchema: z.object({
    barbershopUuid: z.uuidv4().describe("UUID público de la barbería"),
  }),
  execute: async (ctx, input) => {
    const shop = (await ctx.runQuery(api.barbershops.getByUuid, {
      uuid: input.barbershopUuid,
    })) as BarbershopDoc | null;

    if (!shop) {
      return { found: false as const, barbers: [] };
    }

    const barbers = (await ctx.runQuery(
      api.barbershopMemberServices.getBarbershopBarbers,
      { id: shop._id },
    )) as Array<{ name: string }>;

    return {
      found: true as const,
      barbershop: shop.name,
      barbers: barbers.flatMap((b: { name: string }) =>
        b.name ? [{ name: b.name }] : [],
      ),
    };
  },
});

// ---------------------------------------------------------------------------
// PROPOSE TOOLS (writes — return needs-confirmation payload; do NOT mutate)
// ---------------------------------------------------------------------------

const proposeBooking = createTool({
  description:
    "Prepara una propuesta de reserva. NO crea la cita: devuelve un resumen y los argumentos para que el usuario confirme en la interfaz. SIEMPRE valida disponibilidad con `getAvailability` antes de llamar a esta herramienta.",
  inputSchema: z.object({
    barbershopId: z.string().describe("Id interno de la barbería"),
    serviceId: z.string().describe("Id del servicio"),
    barbershopMemberId: z.string().describe("Id del barbero"),
    dateMs: z
      .number()
      .describe("Timestamp UTC en milisegundos de inicio de la cita"),
    customerName: z
      .string()
      .min(3)
      .describe("Nombre del cliente para la reserva"),
    contactPhone: z
      .string()
      .min(10)
      .max(10)
      .describe("Número de celular de 10 dígitos sin código de país"),
    contactEmail: z.string().email().optional(),
    notes: z.string().optional(),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const [shop, service, members] = await Promise.all([
      ctx.runQuery(internal.aiAgentHelpers.getBarbershop, {
        id: input.barbershopId,
      }) as Promise<BarbershopDoc | null>,
      ctx.runQuery(api.services.getById, {
        id: input.serviceId as Id<"services">,
      }) as Promise<ServiceDoc | null>,
      ctx.runQuery(internal.aiAgentHelpers.getMembersByBarbershopId, {
        id: input.barbershopId as Id<"barbershops">,
      }) as Promise<BarberWithName[]>,
    ]);

    if (!shop) throw new Error("Esa barbería no existe.");
    if (!service) throw new Error("Ese servicio no existe.");

    const barber = members.find(
      (m: BarberWithName) =>
        m._id === (input.barbershopMemberId as Id<"barbershopMembers">),
    );

    if (!barber) throw new Error("Ese barbero no trabaja en esta barbería.");

    const slots = (await ctx.runQuery(api.appointments.getAvailableSlots, {
      barbershopId: shop._id,
      barbershopMemberId: barber._id,
      serviceId: service._id,
      date: input.dateMs,
    })) as Slot[];

    const requestedHHMM = timeFormatter.format(new Date(input.dateMs));

    if (!slots.some((s: Slot) => s.time === requestedHHMM)) {
      throw new Error(
        `Ese horario ya no está disponible. Horarios libres: ${
          slots.map((s: Slot) => s.time).join(", ") || "ninguno"
        }.`,
      );
    }

    return {
      kind: proposalKind,
      action: "book",
      summary: `Reservar ${service.name} con ${barber.name} en ${shop.name} el ${formatDate(input.dateMs)} por ${formatPrice(service.price)}.`,
      args: {
        barbershopId: shop._id,
        serviceId: service._id,
        barbershopMemberId: barber._id,
        date: input.dateMs,
        customerName: input.customerName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        notes: input.notes,
      },
    };
  },
});

const proposeCancellation = createTool({
  description:
    "Prepara la cancelación de una cita del usuario autenticado. NO cancela: devuelve un resumen y los argumentos para confirmar en la interfaz.",
  inputSchema: z.object({
    appointmentId: z.string().describe("Id de la cita a cancelar"),
    reason: z
      .string()
      .min(3)
      .describe("Motivo breve de la cancelación (visible para el barbero)"),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const appt = (await ctx.runQuery(api.appointments.getById, {
      id: input.appointmentId as Id<"appointments">,
    })) as AppointmentDoc | null;

    if (!appt || appt.deletedAt) {
      throw new Error("Esa cita no existe o ya fue eliminada.");
    }

    if (appt.userId !== userId) {
      throw new Error("Solo puedes cancelar tus propias citas.");
    }

    const [shop, service] = await Promise.all([
      ctx.runQuery(internal.aiAgentHelpers.getBarbershop, {
        id: appt.barbershopId,
      }) as Promise<BarbershopDoc | null>,
      ctx.runQuery(api.services.getById, {
        id: appt.serviceId,
      }) as Promise<ServiceDoc | null>,
    ]);

    return {
      kind: proposalKind,
      action: "cancel",
      summary: `Cancelar tu cita de ${service?.name ?? "servicio"} en ${shop?.name ?? "la barbería"} programada para el ${formatDate(appt.date)}.`,
      args: {
        appointmentId: appt._id,
        reason: input.reason,
      },
    };
  },
});

const proposeReschedule = createTool({
  description:
    "Prepara una solicitud de reagendamiento para una cita del usuario autenticado. NO reagenda: devuelve un resumen y los argumentos para confirmar.",
  inputSchema: z.object({
    appointmentId: z.string().describe("Id de la cita a reagendar"),
    newDateMs: z
      .number()
      .describe("Nuevo timestamp UTC en milisegundos para la cita"),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const appt = (await ctx.runQuery(api.appointments.getById, {
      id: input.appointmentId as Id<"appointments">,
    })) as AppointmentDoc | null;

    if (!appt || appt.deletedAt) {
      throw new Error("Esa cita no existe o ya fue eliminada.");
    }

    if (appt.userId !== userId) {
      throw new Error("Solo puedes reagendar tus propias citas.");
    }

    if (input.newDateMs <= Date.now()) {
      throw new Error("La nueva fecha debe ser en el futuro.");
    }

    const slots = (await ctx.runQuery(api.appointments.getAvailableSlots, {
      barbershopId: appt.barbershopId,
      barbershopMemberId: appt.barbershopMemberId,
      serviceId: appt.serviceId,
      date: input.newDateMs,
    })) as Slot[];

    const requestedHHMM = timeFormatter.format(new Date(input.newDateMs));

    if (!slots.some((s: Slot) => s.time === requestedHHMM)) {
      throw new Error(
        `Ese horario ya no está disponible. Horarios libres: ${
          slots.map((s: Slot) => s.time).join(", ") || "ninguno"
        }.`,
      );
    }

    return {
      kind: proposalKind,
      action: "reschedule",
      summary: `Solicitar reagendar tu cita al ${formatDate(input.newDateMs)}. El barbero tendrá que aceptarla.`,
      args: {
        appointmentId: appt._id,
        proposedDate: input.newDateMs,
      },
    };
  },
});

export const tools = {
  searchBarbershops,
  getBarbershopDetails,
  getBarbershopTeam,
  listBarbersForService,
  getAvailability,
  getMyAppointments,
  getMyAgenda,
  getMyProfile,
  getMyNotifications,
  getBarbershopReviews,
  proposeBooking,
  proposeCancellation,
  proposeReschedule,
};
