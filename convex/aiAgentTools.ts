import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import { api, internal } from "./_generated/api";
import { formatServicePriceLabel } from "./aiAgentHelpers";
import { itemsLabel, startingLinesMissingFinal } from "./appointmentItems";
import { errorMessages } from "./errors";
import type {
  Appointment,
  Barbershop,
  BarbershopMember,
  InAppNotification,
  Review,
  Service,
} from "./schema";
import { colombiaDateKeyToMs, colombiaDateTimeToMs } from "./utils";

// The model produces Colombia-local date/time STRINGS — never epoch ms, which
// it cannot compute reliably. The tools convert them server-side.
const DATE_DESC =
  "Fecha en formato YYYY-MM-DD (hora Colombia). Calcula tú mismo las fechas relativas (hoy, mañana, 'en una semana', 'el martes de la otra semana') a partir de la fecha actual del contexto; NO preguntes al usuario que las confirme.";
const TIME_DESC =
  "Hora en formato HH:MM de 24 horas (hora Colombia). Ej.: 15:00 = 3 de la tarde.";
const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato YYYY-MM-DD");
const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM (24h)");

const scheduleDay = z.object({
  day: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  isActive: z.boolean(),
  openAt: z.string(),
  closeAt: z.string(),
  lunchStart: z.string().optional(),
  lunchEnd: z.string().optional(),
});

type AppointmentDoc = Appointment;
type BarbershopDoc = Barbershop;
type BarbershopMemberDoc = BarbershopMember;
type ReviewDoc = Review;
type ServiceDoc = Service;
type AvailabilityEntry = BarbershopDoc["availability"][number];
type BarberWithName = BarbershopMemberDoc & { name: string };
type Slot = { time: string; minutes: number };

// Explicit return types for the two read tools that pass a `ctx.runQuery`
// result straight through. Without them TS can't infer `execute`'s return
// (it indirectly references the generated `internal` api), which degrades the
// whole `tools` object to `any`.
type MyBarbershopData =
  | { isMember: false }
  | {
      isMember: true;
      barbershopId: string;
      name: string;
      city: string;
      myMemberId: string;
      roles: Array<"owner" | "barber" | "staff">;
      canManage: boolean;
      staffAppointmentsAllowed: boolean;
      availability: Array<{
        day: string;
        isOpen: boolean;
        openAt: string;
        closeAt: string;
      }>;
      services: Array<{
        serviceId: string;
        name: string;
        price: number;
        priceType: "fixed" | "starting";
        priceFormatted: string;
        durationMinutes: number;
      }>;
      barbers: Array<{
        barbershopMemberId: string;
        name: string;
        isOwner: boolean;
      }>;
    };

type BarberScheduleData =
  | { found: false }
  | {
      found: true;
      barberName: string;
      isCustom: boolean;
      schedule: BarbershopDoc["availability"];
    };

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
    serviceIds: z.string().array(),
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

// Team books on behalf of a walk-in/phone client — same args as `book`, but
// confirmed through the staff-created path (plan-gated, owned by the shop).
const staffBookProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("staffBook"),
  summary: z.string(),
  args: z.object({
    barbershopId: z.string(),
    serviceIds: z.string().array(),
    barbershopMemberId: z.string(),
    date: z.number(),
    customerName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().optional(),
    notes: z.string().optional(),
  }),
});

// Team changes the status of a client's appointment.
const manageAppointmentProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("manageAppointment"),
  summary: z.string(),
  args: z.object({
    appointmentId: z.string(),
    status: z.enum(["completed", "no-show", "cancelled"]),
    reason: z.string().optional(),
  }),
});

// Either party accepts/denies a pending reschedule request.
const answerRescheduleProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("answerReschedule"),
  summary: z.string(),
  args: z.object({
    appointmentId: z.string(),
    accept: z.boolean(),
    answeredBy: z.enum(["customer", "barber"]),
  }),
});

const createServiceProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("createService"),
  summary: z.string(),
  args: z.object({
    barbershopId: z.string(),
    name: z.string(),
    price: z.number(),
    durationMinutes: z.number(),
  }),
});

const updateServiceProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("updateService"),
  summary: z.string(),
  args: z.object({
    barbershopId: z.string(),
    serviceId: z.string(),
    name: z.string().optional(),
    price: z.number().optional(),
    durationMinutes: z.number().optional(),
  }),
});

const deleteServiceProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("deleteService"),
  summary: z.string(),
  args: z.object({
    barbershopId: z.string(),
    serviceId: z.string(),
  }),
});

const updateScheduleProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("updateBarberSchedule"),
  summary: z.string(),
  args: z.object({
    barbershopMemberId: z.string(),
    availability: scheduleDay.array(),
  }),
});

const inviteMemberProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("inviteMember"),
  summary: z.string(),
  args: z.object({
    email: z.string(),
    role: z.enum(["barber", "staff"]),
  }),
});

const removeMemberProposal = z.object({
  kind: z.literal(proposalKind),
  action: z.literal("removeMember"),
  summary: z.string(),
  args: z.object({
    barbershopMemberId: z.string(),
    kind: z.enum(["barber", "staff"]),
  }),
});

export const ProposalSchema = z.discriminatedUnion("action", [
  bookProposal,
  cancelProposal,
  rescheduleProposal,
  staffBookProposal,
  manageAppointmentProposal,
  answerRescheduleProposal,
  createServiceProposal,
  updateServiceProposal,
  deleteServiceProposal,
  updateScheduleProposal,
  inviteMemberProposal,
  removeMemberProposal,
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

const dateOnlyFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Bogota",
});

const formatDate = (ms: number): string => dateFormatter.format(new Date(ms));

/** Day label without a time — for availability lookups (a whole-day query). */
const formatDateOnly = (ms: number): string =>
  dateOnlyFormatter.format(new Date(ms));

const formatPrice = (cop: number): string => priceFormatter.format(cop);

/** "Corte $20.000" / "Barba desde $15.000" — per-line proposal detail. */
const serviceLineLabel = (service: ServiceDoc): string =>
  service.priceType === "starting"
    ? `${service.name} desde ${formatPrice(service.price)}`
    : `${service.name} ${formatPrice(service.price)}`;

/** Joined names + total ("desde"-prefixed when any line is starting). */
const servicesSummary = (selected: ServiceDoc[]) => {
  const total = selected.reduce((sum, service) => sum + service.price, 0);
  const hasStarting = selected.some(
    (service) => service.priceType === "starting",
  );

  return {
    label: selected.map((service) => service.name).join(" + "),
    totalLabel: hasStarting
      ? `desde ${formatPrice(total)}`
      : formatPrice(total),
    detail:
      selected.length > 1
        ? ` (${selected.map(serviceLineLabel).join(" + ")})`
        : "",
  };
};

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
        priceType: s.priceType ?? "fixed",
        priceFormatted: formatServicePriceLabel(s),
        durationMinutes: s.duration,
      })),
    };
  },
});

const listBarbersForService = createTool({
  description:
    "Lista los barberos que ofrecen TODOS los servicios seleccionados. Necesario antes de proponer una reserva: el `barbershopMemberId` se obtiene aquí.",
  inputSchema: z.object({
    serviceIds: z
      .string()
      .array()
      .min(1)
      .describe("Ids de los servicios (de `getBarbershopDetails`)"),
  }),
  execute: async (ctx, input) => {
    const barbers = (await ctx.runQuery(
      api.barbershopMemberServices.getBarbersForServices,
      { serviceIds: input.serviceIds as Service["_id"][] },
    )) as (BarberWithName | null)[];

    return barbers.flatMap((b) =>
      b ? [{ barbershopMemberId: b._id, name: b.name }] : [],
    );
  },
});

const getAvailability = createTool({
  description:
    "Devuelve los horarios disponibles (en formato HH:MM) para reservar con un barbero, en una fecha y uno o varios servicios (la cita ocupa la suma de sus duraciones). Úsala SIEMPRE antes de proponer una reserva.",
  inputSchema: z.object({
    barbershopId: z.string().describe("Id interno de la barbería"),
    barbershopMemberId: z
      .string()
      .describe(
        "Id del barbero (de `listBarbersForService` o `getMyBarbershop`)",
      ),
    serviceIds: z.string().array().min(1).describe("Ids de los servicios"),
    date: dateField.describe(DATE_DESC),
  }),
  execute: async (ctx, input) => {
    const dateMs = colombiaDateKeyToMs(input.date);

    const slots = (await ctx.runQuery(api.appointments.getAvailableSlots, {
      barbershopId: input.barbershopId as Barbershop["_id"],
      barbershopMemberId: input.barbershopMemberId as BarbershopMember["_id"],
      serviceIds: input.serviceIds as Service["_id"][],
      date: dateMs,
    })) as Slot[];

    return {
      date: formatDateOnly(dateMs),
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
      appointmentId: Appointment["_id"];
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
        // Snapshot lines are canonical; the live service only labels legacy
        // rows (a renamed/deleted service must not rewrite past bookings).
        const [shop, legacyService, members] = await Promise.all([
          ctx.runQuery(internal.aiAgentHelpers.getBarbershop, {
            id: appt.barbershopId,
          }) as Promise<BarbershopDoc | null>,
          appt.items?.length
            ? Promise.resolve(null)
            : (ctx.runQuery(api.services.getById, {
                id: appt.serviceId,
              }) as Promise<ServiceDoc | null>),
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
          service: appt.items?.length
            ? itemsLabel(appt.items)
            : (legacyService?.name ?? ""),
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

    // Live lookups only label legacy rows; item-carrying rows use snapshots.
    const serviceIds = [
      ...new Set(sliced.flatMap((a) => (a.items?.length ? [] : [a.serviceId]))),
    ];
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
        service: a.items?.length
          ? itemsLabel(a.items)
          : (serviceNames.get(a.serviceId) ?? ""),
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
      notifications: InAppNotification[];
      lastRead: number | null;
    };

    return {
      count: notifications.length,
      notifications: notifications.map((n: InAppNotification) => ({
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
    serviceIds: z
      .string()
      .array()
      .min(1)
      .describe("Ids de los servicios (uno o varios, en el orden pedido)"),
    barbershopMemberId: z.string().describe("Id del barbero"),
    date: dateField.describe(DATE_DESC),
    time: timeField.describe(TIME_DESC),
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
    if (new Set(input.serviceIds).size !== input.serviceIds.length) {
      throw new Error(errorMessages.duplicateAppointmentService);
    }

    const dateMs = colombiaDateTimeToMs(input.date, input.time);

    const [shop, loadedServices, members] = await Promise.all([
      ctx.runQuery(internal.aiAgentHelpers.getBarbershop, {
        id: input.barbershopId,
      }) as Promise<BarbershopDoc | null>,
      ctx.runQuery(api.services.getByIds, {
        serviceIds: input.serviceIds.map((serviceId) => ({
          id: serviceId as Service["_id"],
        })),
      }) as Promise<(ServiceDoc | null)[]>,
      ctx.runQuery(internal.aiAgentHelpers.getMembersByBarbershopId, {
        id: input.barbershopId as Barbershop["_id"],
      }) as Promise<BarberWithName[]>,
    ]);

    if (!shop) throw new Error("Esa barbería no existe.");

    const selectedServices = loadedServices.filter(
      (service): service is ServiceDoc => !!service,
    );

    if (selectedServices.length !== input.serviceIds.length) {
      throw new Error("Alguno de esos servicios no existe.");
    }

    const barber = members.find(
      (m: BarberWithName) =>
        m._id === (input.barbershopMemberId as BarbershopMember["_id"]),
    );

    if (!barber) throw new Error("Ese barbero no trabaja en esta barbería.");

    const slots = (await ctx.runQuery(api.appointments.getAvailableSlots, {
      barbershopId: shop._id,
      barbershopMemberId: barber._id,
      serviceIds: selectedServices.map((service) => service._id),
      date: dateMs,
    })) as Slot[];

    if (!slots.some((s: Slot) => s.time === input.time)) {
      throw new Error(
        `Ese horario ya no está disponible. Horarios libres: ${
          slots.map((s: Slot) => s.time).join(", ") || "ninguno"
        }.`,
      );
    }

    const summary = servicesSummary(selectedServices);

    return {
      kind: proposalKind,
      action: "book",
      summary: `Reservar ${summary.label} con ${barber.name} en ${shop.name} el ${formatDate(dateMs)} por ${summary.totalLabel}${summary.detail}.`,
      args: {
        barbershopId: shop._id,
        serviceIds: selectedServices.map((service) => service._id),
        barbershopMemberId: barber._id,
        date: dateMs,
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
      id: input.appointmentId as Appointment["_id"],
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
    date: dateField.describe(DATE_DESC),
    time: timeField.describe(TIME_DESC),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const newDateMs = colombiaDateTimeToMs(input.date, input.time);

    const appt = (await ctx.runQuery(api.appointments.getById, {
      id: input.appointmentId as Appointment["_id"],
    })) as AppointmentDoc | null;

    if (!appt || appt.deletedAt) {
      throw new Error("Esa cita no existe o ya fue eliminada.");
    }

    if (appt.userId !== userId) {
      throw new Error("Solo puedes reagendar tus propias citas.");
    }

    if (newDateMs <= Date.now()) {
      throw new Error("La nueva fecha debe ser en el futuro.");
    }

    // Snapshot lines drive the width (durationMinutes) so the re-check works
    // even if a line's service was edited or deleted after booking.
    const slots = (await ctx.runQuery(api.appointments.getAvailableSlots, {
      barbershopId: appt.barbershopId,
      barbershopMemberId: appt.barbershopMemberId,
      serviceIds: appt.items?.map((line) => line.serviceId) ?? [appt.serviceId],
      durationMinutes: appt.items?.reduce(
        (total, line) => total + line.duration,
        0,
      ),
      date: newDateMs,
    })) as Slot[];

    if (!slots.some((s: Slot) => s.time === input.time)) {
      throw new Error(
        `Ese horario ya no está disponible. Horarios libres: ${
          slots.map((s: Slot) => s.time).join(", ") || "ninguno"
        }.`,
      );
    }

    return {
      kind: proposalKind,
      action: "reschedule",
      summary: `Solicitar reagendar tu cita al ${formatDate(newDateMs)}. El barbero tendrá que aceptarla.`,
      args: {
        appointmentId: appt._id,
        proposedDate: newDateMs,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// TEAM READ TOOLS (caller's own shop)
// ---------------------------------------------------------------------------

const getMyBarbershop = createTool({
  description:
    "Devuelve la barbería del PROPIO usuario cuando hace parte del equipo (dueño, barbero o recepcionista): su id, servicios (con precio y duración + sus ids), barberos activos (con sus ids), horario semanal, y el id del miembro que está escribiendo (`myMemberId`) con sus roles. Úsala SIEMPRE en lugar de searchBarbershops/getBarbershopDetails/listBarbersForService cuando un miembro del equipo quiere agendar o gestionar algo en SU PROPIA barbería: ya sabes dónde trabaja, no lo busques. Requiere sesión.",
  inputSchema: z.object({}),
  execute: async (ctx): Promise<MyBarbershopData> => {
    const userId = requireAuthUserId(ctx.userId);
    return (await ctx.runQuery(internal.aiAgentHelpers.getMyBarbershopData, {
      userId,
    })) as MyBarbershopData;
  },
});

const getBarberSchedule = createTool({
  description:
    "Devuelve el horario semanal vigente de un barbero (horas por día y descansos). Úsala para mostrarlo, o como base ANTES de proponer un cambio con proposeUpdateBarberSchedule. Pásale el barbershopMemberId de getMyBarbershop.",
  inputSchema: z.object({
    barbershopMemberId: z
      .string()
      .describe("Id del barbero (de getMyBarbershop)"),
  }),
  execute: async (ctx, input): Promise<BarberScheduleData> => {
    return (await ctx.runQuery(internal.aiAgentHelpers.getBarberScheduleData, {
      barbershopMemberId: input.barbershopMemberId,
    })) as BarberScheduleData;
  },
});

// ---------------------------------------------------------------------------
// TEAM PROPOSE TOOLS (writes — return needs-confirmation; do NOT mutate)
// ---------------------------------------------------------------------------

const proposeStaffBooking = createTool({
  description:
    "Prepara una reserva que un miembro del equipo (barbero o recepcionista) hace POR un cliente de la barbería, asignándola a un barbero. NO crea la cita; devuelve una tarjeta de confirmación. Valida disponibilidad con getAvailability antes. Si quien escribe es barbero y atenderá él mismo, usa su propio `myMemberId` como barbershopMemberId. Requiere sesión y un plan que permita crear citas por clientes.",
  inputSchema: z.object({
    serviceIds: z
      .string()
      .array()
      .min(1)
      .describe("Ids de los servicios (de getMyBarbershop, uno o varios)"),
    barbershopMemberId: z
      .string()
      .describe("Id del barbero que atenderá (de getMyBarbershop)"),
    date: dateField.describe(DATE_DESC),
    time: timeField.describe(TIME_DESC),
    customerName: z.string().min(3).describe("Nombre del cliente"),
    contactPhone: z
      .string()
      .min(10)
      .max(10)
      .describe("Celular del cliente, 10 dígitos"),
    contactEmail: z.string().email().optional(),
    notes: z.string().optional(),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const actor = await ctx.runQuery(
      internal.aiAgentHelpers.getAgentActorContext,
      { userId },
    );

    if (!actor.isMember) {
      throw new Error(
        "Solo un miembro del equipo puede agendar por un cliente.",
      );
    }

    if (!actor.roles.includes("barber") && !actor.roles.includes("staff")) {
      throw new Error(
        "Solo barberos o recepcionistas pueden agendar por un cliente.",
      );
    }

    if (!actor.staffAppointmentsAllowed) {
      throw new Error(
        "El plan de la barbería no permite crear citas por tus clientes desde el chat. Está disponible en los planes Barbería y Barbería Profesional.",
      );
    }

    if (new Set(input.serviceIds).size !== input.serviceIds.length) {
      throw new Error(errorMessages.duplicateAppointmentService);
    }

    const dateMs = colombiaDateTimeToMs(input.date, input.time);
    const barbershopId = actor.barbershopId as Barbershop["_id"];

    const [loadedServices, members] = await Promise.all([
      ctx.runQuery(api.services.getByIds, {
        serviceIds: input.serviceIds.map((serviceId) => ({
          id: serviceId as Service["_id"],
        })),
      }) as Promise<(ServiceDoc | null)[]>,
      ctx.runQuery(internal.aiAgentHelpers.getMembersByBarbershopId, {
        id: barbershopId,
      }) as Promise<BarberWithName[]>,
    ]);

    const selectedServices = loadedServices.filter(
      (service): service is ServiceDoc => !!service,
    );

    if (selectedServices.length !== input.serviceIds.length) {
      throw new Error("Alguno de esos servicios no existe.");
    }

    const barber = members.find(
      (m) => m._id === (input.barbershopMemberId as BarbershopMember["_id"]),
    );

    if (!barber) throw new Error("Ese barbero no trabaja en esta barbería.");

    const slots = (await ctx.runQuery(api.appointments.getAvailableSlots, {
      barbershopId,
      barbershopMemberId: barber._id,
      serviceIds: selectedServices.map((service) => service._id),
      date: dateMs,
    })) as Slot[];

    if (!slots.some((s: Slot) => s.time === input.time)) {
      throw new Error(
        `Ese horario ya no está disponible. Horarios libres: ${
          slots.map((s: Slot) => s.time).join(", ") || "ninguno"
        }.`,
      );
    }

    const summary = servicesSummary(selectedServices);

    return {
      kind: proposalKind,
      action: "staffBook",
      summary: `Agendar ${summary.label} para ${input.customerName} con ${barber.name} el ${formatDate(dateMs)} (${summary.totalLabel}${summary.detail}).`,
      args: {
        barbershopId: barbershopId as string,
        serviceIds: selectedServices.map((service) => service._id),
        barbershopMemberId: barber._id,
        date: dateMs,
        customerName: input.customerName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        notes: input.notes,
      },
    };
  },
});

const proposeManageAppointment = createTool({
  description:
    "Prepara un cambio de estado de la cita de un cliente por parte del equipo: marcarla como completada, como que el cliente no asistió ('no-show'), o cancelarla avisando al cliente. NO la cambia; devuelve una tarjeta de confirmación. (Para reagendar usa proposeReschedule o proposeAnswerReschedule.) Requiere ser dueño, barbero o recepcionista de la barbería de la cita.",
  inputSchema: z.object({
    appointmentId: z.string().describe("Id de la cita (de getMyAgenda)"),
    status: z.enum(["completed", "no-show", "cancelled"]),
    reason: z
      .string()
      .optional()
      .describe("Motivo breve, requerido al cancelar (lo ve el cliente)"),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const appt = (await ctx.runQuery(api.appointments.getById, {
      id: input.appointmentId as Appointment["_id"],
    })) as AppointmentDoc | null;

    if (!appt || appt.deletedAt) {
      throw new Error("Esa cita no existe o ya fue eliminada.");
    }

    const actor = await ctx.runQuery(
      internal.aiAgentHelpers.getAgentActorContext,
      { userId },
    );

    if (
      !actor.isMember ||
      actor.barbershopId !== (appt.barbershopId as string)
    ) {
      throw new Error("Solo puedes gestionar citas de tu propia barbería.");
    }

    if (input.status === "cancelled" && !input.reason) {
      throw new Error("Necesito un motivo breve para cancelar la cita.");
    }

    // Completion of "desde"-priced lines needs the agreed final prices, which
    // the chat card cannot collect — `setStatus` would reject the confirm.
    if (input.status === "completed") {
      const missing = startingLinesMissingFinal(appt.items ?? []);

      if (missing.length > 0) {
        const names = missing.map((line) => line.name).join(", ");

        throw new Error(
          `La cita incluye servicios con precio "desde" (${names}). Márcala como completada desde el panel de citas, donde se ingresa el precio final acordado.`,
        );
      }
    }

    const labels = {
      completed: "completada",
      "no-show": "no asistió",
      cancelled: "cancelada",
    } as const;

    return {
      kind: proposalKind,
      action: "manageAppointment",
      summary: `Marcar la cita de ${appt.customerName} (${formatDate(appt.date)}) como ${labels[input.status]}.`,
      args: {
        appointmentId: appt._id,
        status: input.status,
        reason: input.reason,
      },
    };
  },
});

const proposeAnswerReschedule = createTool({
  description:
    "Prepara la respuesta a una solicitud de cambio de hora PENDIENTE: aceptarla (mueve la cita a la hora propuesta) o rechazarla. Quien responde es la parte contraria a quien la pidió. NO responde sola; devuelve una tarjeta de confirmación. La puede responder el cliente dueño de la cita o un miembro del equipo de la barbería.",
  inputSchema: z.object({
    appointmentId: z
      .string()
      .describe("Id de la cita con la solicitud pendiente"),
    accept: z.boolean(),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const appt = (await ctx.runQuery(api.appointments.getById, {
      id: input.appointmentId as Appointment["_id"],
    })) as AppointmentDoc | null;

    if (!appt || appt.deletedAt) {
      throw new Error("Esa cita no existe o ya fue eliminada.");
    }

    if (appt.status !== "pending" || !appt.proposedDate) {
      throw new Error(
        "Esa cita no tiene una solicitud de cambio de hora pendiente.",
      );
    }

    const isCustomer = appt.userId === userId;
    let isShop = false;

    if (!isCustomer) {
      const actor = await ctx.runQuery(
        internal.aiAgentHelpers.getAgentActorContext,
        { userId },
      );
      isShop =
        actor.isMember && actor.barbershopId === (appt.barbershopId as string);
    }

    if (!isCustomer && !isShop) {
      throw new Error("No tienes acceso a esa cita.");
    }

    const answeredBy = isCustomer ? "customer" : "barber";
    const verb = input.accept ? "Aceptar" : "Rechazar";

    return {
      kind: proposalKind,
      action: "answerReschedule",
      summary: `${verb} el cambio de hora de la cita de ${appt.customerName} al ${formatDate(appt.proposedDate)}.`,
      args: { appointmentId: appt._id, accept: input.accept, answeredBy },
    };
  },
});

const proposeCreateService = createTool({
  description:
    "Prepara la creación de un servicio nuevo en la barbería del usuario (nombre, precio en COP, duración en minutos). NO lo crea; devuelve una tarjeta de confirmación. Requiere ser dueño, barbero o recepcionista.",
  inputSchema: z.object({
    name: z.string().min(3),
    price: z
      .number()
      .min(1000)
      .describe("Precio en pesos colombianos (COP), p. ej. 25000"),
    durationMinutes: z.number().min(5).max(480),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const actor = await ctx.runQuery(
      internal.aiAgentHelpers.getAgentActorContext,
      { userId },
    );

    if (!actor.isMember) {
      throw new Error("Solo un miembro del equipo puede crear servicios.");
    }

    return {
      kind: proposalKind,
      action: "createService",
      summary: `Crear el servicio "${input.name}" por ${formatPrice(input.price)} (${input.durationMinutes} min).`,
      args: {
        barbershopId: actor.barbershopId as string,
        name: input.name,
        price: input.price,
        durationMinutes: input.durationMinutes,
      },
    };
  },
});

const proposeUpdateService = createTool({
  description:
    "Prepara la edición de un servicio (nombre, precio y/o duración — manda solo lo que cambia). NO lo edita; devuelve una tarjeta de confirmación. Solo dueño o recepcionista. Pásale el serviceId de getMyBarbershop.",
  inputSchema: z.object({
    serviceId: z.string(),
    name: z.string().min(3).optional(),
    price: z.number().min(1000).optional(),
    durationMinutes: z.number().min(5).max(480).optional(),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const actor = await ctx.runQuery(
      internal.aiAgentHelpers.getAgentActorContext,
      { userId },
    );

    if (!actor.canManageTeam) {
      throw new Error(
        "Solo el dueño o la recepcionista pueden editar servicios.",
      );
    }

    const service = (await ctx.runQuery(api.services.getById, {
      id: input.serviceId as Service["_id"],
    })) as ServiceDoc | null;

    if (!service || (service.barbershopId as string) !== actor.barbershopId) {
      throw new Error("Ese servicio no es de tu barbería.");
    }

    if (
      input.name === undefined &&
      input.price === undefined &&
      input.durationMinutes === undefined
    ) {
      throw new Error("Dime qué quieres cambiar: nombre, precio o duración.");
    }

    const parts: string[] = [];
    if (input.name !== undefined) parts.push(`nombre a "${input.name}"`);
    if (input.price !== undefined)
      parts.push(`precio a ${formatPrice(input.price)}`);
    if (input.durationMinutes !== undefined)
      parts.push(`duración a ${input.durationMinutes} min`);

    return {
      kind: proposalKind,
      action: "updateService",
      summary: `Actualizar "${service.name}": ${parts.join(", ")}.`,
      args: {
        barbershopId: actor.barbershopId as string,
        serviceId: service._id,
        name: input.name,
        price: input.price,
        durationMinutes: input.durationMinutes,
      },
    };
  },
});

const proposeDeleteService = createTool({
  description:
    "Prepara la eliminación de un servicio. Avisa cuántas citas futuras se cancelarían. NO lo elimina; devuelve una tarjeta de confirmación. Solo dueño o recepcionista. Pásale el serviceId de getMyBarbershop.",
  inputSchema: z.object({ serviceId: z.string() }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const actor = await ctx.runQuery(
      internal.aiAgentHelpers.getAgentActorContext,
      { userId },
    );

    if (!actor.canManageTeam) {
      throw new Error(
        "Solo el dueño o la recepcionista pueden eliminar servicios.",
      );
    }

    const service = (await ctx.runQuery(api.services.getById, {
      id: input.serviceId as Service["_id"],
    })) as ServiceDoc | null;

    if (!service || (service.barbershopId as string) !== actor.barbershopId) {
      throw new Error("Ese servicio no es de tu barbería.");
    }

    const impacted = (await ctx.runQuery(
      internal.aiAgentHelpers.countImpactedByService,
      { serviceId: service._id },
    )) as { willCancel: number; willUpdate: number };

    const effects: string[] = [];

    if (impacted.willCancel > 0) {
      effects.push(`cancelará ${impacted.willCancel} cita(s) futura(s)`);
    }

    if (impacted.willUpdate > 0) {
      effects.push(
        `quitará el servicio de ${impacted.willUpdate} cita(s) que tienen más servicios`,
      );
    }

    const warn =
      effects.length > 0
        ? ` Esto ${effects.join(" y ")}; se avisará a esos clientes.`
        : "";

    return {
      kind: proposalKind,
      action: "deleteService",
      summary: `Eliminar el servicio "${service.name}".${warn}`,
      args: {
        barbershopId: actor.barbershopId as string,
        serviceId: service._id,
      },
    };
  },
});

const proposeUpdateBarberSchedule = createTool({
  description:
    "Prepara la actualización del horario semanal de un barbero. DEBES incluir los 7 días (monday…sunday); parte del horario actual de getBarberSchedule y cambia solo lo necesario; marca isActive=false en los días de descanso. NO lo cambia; devuelve una tarjeta de confirmación. El dueño puede cambiar el de cualquier barbero; la recepcionista solo el suyo.",
  inputSchema: z.object({
    barbershopMemberId: z.string(),
    availability: scheduleDay
      .array()
      .describe(
        "Los 7 días con sus horas en HH:MM y descansos (lunchStart/lunchEnd). isActive=false marca un día de descanso.",
      ),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    // updateBarberSchedule replaces the whole availability array, so a partial
    // submission would silently wipe the omitted days. Enforce the complete,
    // duplicate-free week the tool description promises before proposing.
    const expectedDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ] as const;
    const providedDays = new Set(input.availability.map((d) => d.day));
    if (
      providedDays.size !== expectedDays.length ||
      !expectedDays.every((d) => providedDays.has(d))
    ) {
      throw new Error(
        "Debes incluir los 7 días de la semana (monday a sunday), sin duplicados.",
      );
    }

    const actor = await ctx.runQuery(
      internal.aiAgentHelpers.getAgentActorContext,
      { userId },
    );

    if (!actor.isMember || !actor.canManageTeam) {
      throw new Error(
        "Solo el dueño o la recepcionista pueden cambiar horarios.",
      );
    }

    if (!actor.isOwner && actor.memberId !== input.barbershopMemberId) {
      throw new Error("La recepcionista solo puede cambiar su propio horario.");
    }

    const sched = await ctx.runQuery(
      internal.aiAgentHelpers.getBarberScheduleData,
      { barbershopMemberId: input.barbershopMemberId },
    );

    if (!sched.found) throw new Error("Ese barbero no existe.");

    const activeDays = input.availability.filter((d) => d.isActive).length;

    return {
      kind: proposalKind,
      action: "updateBarberSchedule",
      summary: `Actualizar el horario de ${sched.barberName}: ${activeDays} día(s) activos a la semana.`,
      args: {
        barbershopMemberId: input.barbershopMemberId,
        availability: input.availability,
      },
    };
  },
});

const proposeInviteMember = createTool({
  description:
    "Prepara una invitación por correo para sumar un barbero o una recepcionista al equipo (la persona recibe un correo para aceptar). NO la envía; devuelve una tarjeta de confirmación. Invitar barberos: dueño o recepcionista. Invitar recepcionistas: solo el dueño. Sujeto a los límites del plan.",
  inputSchema: z.object({
    email: z.string().email(),
    role: z
      .enum(["barber", "staff"])
      .describe("barber = barbero, staff = recepcionista"),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const actor = await ctx.runQuery(
      internal.aiAgentHelpers.getAgentActorContext,
      { userId },
    );

    if (!actor.isMember) {
      throw new Error("Solo un miembro del equipo puede invitar.");
    }

    if (input.role === "staff" && !actor.isOwner) {
      throw new Error("Solo el dueño puede invitar recepcionistas.");
    }

    if (input.role === "barber" && !actor.canManageTeam) {
      throw new Error(
        "Solo el dueño o la recepcionista pueden invitar barberos.",
      );
    }

    const roleEs = input.role === "staff" ? "recepcionista" : "barbero";

    return {
      kind: proposalKind,
      action: "inviteMember",
      summary: `Invitar a ${input.email} como ${roleEs}.`,
      args: { email: input.email, role: input.role },
    };
  },
});

const proposeRemoveMember = createTool({
  description:
    "Prepara la salida de un barbero o recepcionista del equipo. Para barberos, avisa cuántas citas futuras se cancelarían. NO lo quita; devuelve una tarjeta de confirmación. Solo el dueño. Pásale el barbershopMemberId de getMyBarbershop.",
  inputSchema: z.object({
    barbershopMemberId: z.string(),
    kind: z.enum(["barber", "staff"]),
  }),
  execute: async (ctx, input): Promise<Proposal> => {
    const userId = requireAuthUserId(ctx.userId);

    const actor = await ctx.runQuery(
      internal.aiAgentHelpers.getAgentActorContext,
      { userId },
    );

    if (!actor.isOwner) {
      throw new Error("Solo el dueño puede quitar miembros del equipo.");
    }

    let warn = "";
    if (input.kind === "barber") {
      const impacted = (await ctx.runQuery(
        internal.aiAgentHelpers.countImpactedByMember,
        { barbershopMemberId: input.barbershopMemberId },
      )) as number;

      if (impacted > 0) {
        warn = ` Esto cancelará ${impacted} cita(s) futura(s) y se avisará a esos clientes.`;
      }
    }

    const roleEs = input.kind === "staff" ? "recepcionista" : "barbero";

    return {
      kind: proposalKind,
      action: "removeMember",
      summary: `Quitar a este ${roleEs} del equipo.${warn}`,
      args: {
        barbershopMemberId: input.barbershopMemberId,
        kind: input.kind,
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
  getMyBarbershop,
  getBarberSchedule,
  proposeBooking,
  proposeCancellation,
  proposeReschedule,
  proposeStaffBooking,
  proposeManageAppointment,
  proposeAnswerReschedule,
  proposeCreateService,
  proposeUpdateService,
  proposeDeleteService,
  proposeUpdateBarberSchedule,
  proposeInviteMember,
  proposeRemoveMember,
};
