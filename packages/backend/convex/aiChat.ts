import {
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zAction, zMutation, zQuery } from ".";
import { api, components, internal } from "./_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { panaAgent } from "./aiAgent";
import { resolvePanaAccessForUserId } from "./aiAgentHelpers";
import { track } from "./analytics";
import { getUserId } from "./identity";
import { rateLimiter } from "./ratelimit";
import type {
  Appointment,
  Barbershop,
  BarbershopMember,
  Service,
} from "./schema";

const ANON_PREFIX = "anon:";

async function resolveCallerId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  userId: string | undefined,
): Promise<string> {
  const authedUserId = await getUserId(ctx);

  if (authedUserId) return authedUserId;

  if (userId && userId.length > 0) {
    return `${ANON_PREFIX}${userId}`;
  }
  throw new ConvexError("Falta el identificador de sesión. Recarga la página.");
}

async function authorizeThreadAccess(
  ctx: Parameters<typeof listUIMessages>[0],
  threadId: string,
  callerId: string,
) {
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  });

  if (!thread) throw new ConvexError("Esta conversación no existe.");
  if (thread.userId !== callerId)
    throw new ConvexError("No tienes acceso a esta conversación.");

  return thread;
}

/**
 * Starts a new conversation and sends its first message in a single round-trip,
 * then schedules the AI response and the title generation. Combining the two
 * mutations the client used to make (create + send) removes a network hop, so
 * the first message lands instantly when we navigate to `/chat/$threadId`.
 *
 * The thread is created without a title on purpose — `generateThreadTitle`
 * fills it in from this first message, letting the sidebar show a skeleton in
 * the meantime.
 */
export const createThreadAndSend = zMutation({
  args: z.object({
    prompt: z.string(),
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);

    const isAnon = callerId.startsWith(ANON_PREFIX);
    await rateLimiter.limit(
      ctx,
      isAnon ? "aiSendMessageAnon" : "aiSendMessage",
      { key: callerId, throws: true },
    );

    const threadId = await createThread(ctx, components.agent, {
      userId: callerId,
    });

    const { messageId } = await panaAgent.saveMessage(ctx, {
      threadId,
      userId: callerId,
      prompt: args.prompt,
      skipEmbeddings: true,
    });

    await Promise.all([
      ctx.scheduler.runAfter(0, internal.aiStream.streamResponse, {
        threadId,
        promptMessageId: messageId,
        callerId,
        prompt: args.prompt,
      }),
      ctx.scheduler.runAfter(0, internal.aiStream.generateThreadTitle, {
        threadId,
        prompt: args.prompt,
        callerId,
      }),
      track(ctx, {
        distinctId: callerId,
        event: "ai_thread_started",
        properties: { isAnon },
      }),
    ]);

    return { threadId };
  },
});

export const listMyThreads = zQuery({
  args: z.object({
    userId: z.string().optional(),
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId).catch(() => null);

    if (!callerId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: callerId,
      paginationOpts: args.paginationOpts,
      order: "desc",
    });
  },
});

export const listMessages = zQuery({
  args: z.object({
    threadId: z.string(),
    userId: z.string().optional(),
    paginationOpts: convexToZod(paginationOptsValidator),
    streamArgs: convexToZod(vStreamArgs),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);

    await authorizeThreadAccess(ctx, args.threadId, callerId);

    const [streams, paginated] = await Promise.all([
      syncStreams(ctx, components.agent, {
        threadId: args.threadId,
        streamArgs: args.streamArgs,
      }),
      listUIMessages(ctx, components.agent, {
        threadId: args.threadId,
        paginationOpts: args.paginationOpts,
      }),
    ]);

    return { ...paginated, streams };
  },
});

export const sendMessage = zMutation({
  args: z.object({
    threadId: z.string(),
    prompt: z.string(),
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);

    const isAnon = callerId.startsWith(ANON_PREFIX);
    await Promise.all([
      authorizeThreadAccess(ctx, args.threadId, callerId),
      rateLimiter.limit(ctx, isAnon ? "aiSendMessageAnon" : "aiSendMessage", {
        key: callerId,
        throws: true,
      }),
    ]);

    const { messageId } = await panaAgent.saveMessage(ctx, {
      threadId: args.threadId,
      userId: callerId,
      prompt: args.prompt,
      skipEmbeddings: true,
    });

    await ctx.scheduler.runAfter(0, internal.aiStream.streamResponse, {
      threadId: args.threadId,
      promptMessageId: messageId,
      callerId,
      prompt: args.prompt,
    });
  },
});

const scheduleDayArg = z.object({
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

const bookArgs = z.object({
  barbershopId: z.string(),
  /** Pre-deploy proposals carry a single `serviceId`; new ones `serviceIds`. */
  serviceId: z.string().optional(),
  serviceIds: z.string().array().optional(),
  barbershopMemberId: z.string(),
  date: z.number(),
  customerName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string().optional(),
  notes: z.string().optional(),
});

const confirmActionArgs = z.discriminatedUnion("action", [
  z.object({ action: z.literal("book"), args: bookArgs }),
  z.object({ action: z.literal("staffBook"), args: bookArgs }),
  z.object({
    action: z.literal("cancel"),
    args: z.object({ appointmentId: z.string(), reason: z.string() }),
  }),
  z.object({
    action: z.literal("reschedule"),
    args: z.object({
      appointmentId: z.string(),
      proposedDate: z.number(),
    }),
  }),
  z.object({
    action: z.literal("manageAppointment"),
    args: z.object({
      appointmentId: z.string(),
      status: z.enum(["completed", "no-show", "cancelled"]),
      reason: z.string().optional(),
      /** Final agreed price per "desde" line, collected on the proposal card. */
      finalPrices: z
        .object({
          serviceId: z.string(),
          finalPrice: z.number(),
        })
        .array()
        .optional(),
    }),
  }),
  z.object({
    action: z.literal("answerReschedule"),
    args: z.object({
      appointmentId: z.string(),
      accept: z.boolean(),
      answeredBy: z.enum(["customer", "barber"]),
    }),
  }),
  z.object({
    action: z.literal("createService"),
    args: z.object({
      barbershopId: z.string(),
      name: z.string(),
      price: z.number(),
      priceType: z.enum(["fixed", "starting"]).optional(),
      durationMinutes: z.number(),
    }),
  }),
  z.object({
    action: z.literal("updateService"),
    args: z.object({
      barbershopId: z.string(),
      serviceId: z.string(),
      name: z.string().optional(),
      price: z.number().optional(),
      priceType: z.enum(["fixed", "starting"]).optional(),
      durationMinutes: z.number().optional(),
    }),
  }),
  z.object({
    action: z.literal("deleteService"),
    args: z.object({ barbershopId: z.string(), serviceId: z.string() }),
  }),
  z.object({
    action: z.literal("updateBarberSchedule"),
    args: z.object({
      barbershopMemberId: z.string(),
      availability: scheduleDayArg.array(),
    }),
  }),
  z.object({
    action: z.literal("inviteMember"),
    args: z.object({
      email: z.string(),
      role: z.enum(["barber", "staff"]),
    }),
  }),
  z.object({
    action: z.literal("removeMember"),
    args: z.object({
      barbershopMemberId: z.string(),
      kind: z.enum(["barber", "staff"]),
    }),
  }),
]);

/** Tolerates proposals minted before the multi-service deploy. */
const bookServiceIds = (args: {
  serviceIds?: string[];
  serviceId?: string;
}): Service["_id"][] => {
  const ids = args.serviceIds ?? (args.serviceId ? [args.serviceId] : []);

  return ids as Service["_id"][];
};

const requireAuthed = (isAnon: boolean) => {
  if (isAnon) {
    throw new ConvexError(
      "Necesitas iniciar sesión para hacer esta acción en PanaBarbero.",
    );
  }
};

export const confirmPendingAction = zAction({
  args: z.object({
    threadId: z.string(),
    userId: z.string().optional(),
    pending: confirmActionArgs,
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);
    await authorizeThreadAccess(ctx, args.threadId, callerId);

    const isAnon = callerId.startsWith(ANON_PREFIX);
    const pending = args.pending;
    let summary: string;

    switch (pending.action) {
      case "book": {
        const a = pending.args;
        await ctx.runMutation(internal.appointments.agentBook, {
          userId: callerId,
          barbershopId: a.barbershopId as Barbershop["_id"],
          serviceIds: bookServiceIds(a),
          barbershopMemberId: a.barbershopMemberId as BarbershopMember["_id"],
          date: a.date,
          customerName: a.customerName,
          contactPhone: a.contactPhone,
          contactEmail: a.contactEmail,
          notes: a.notes,
        });
        summary = "Tu cita quedó reservada. ¡Nos vemos pronto!";
        break;
      }
      case "staffBook": {
        requireAuthed(isAnon);
        const a = pending.args;
        // `create` (isStaffCreated) enforces barber/staff role + paid plan via
        // requireUserId(ctx.auth) — the authoritative gate.
        await ctx.runMutation(api.appointments.create, {
          appointment: {
            barbershopId: a.barbershopId as Barbershop["_id"],
            serviceIds: bookServiceIds(a),
            barbershopMemberId: a.barbershopMemberId as BarbershopMember["_id"],
            date: a.date,
            customerName: a.customerName,
            contactPhone: a.contactPhone,
            contactEmail: a.contactEmail,
            notes: a.notes,
            isStaffCreated: true,
          },
        });
        summary = `Listo, agendé la cita de ${a.customerName}.`;
        break;
      }
      case "cancel": {
        requireAuthed(isAnon);
        const a = pending.args;
        await ctx.runQuery(internal.aiAgentHelpers.assertAppointmentActor, {
          userId: callerId,
          appointmentId: a.appointmentId,
          requiredActor: "customer",
        });
        await ctx.runMutation(api.appointments.cancel, {
          appointmentId: { id: a.appointmentId as Appointment["_id"] },
          cancelledByUserId: callerId,
          reason: a.reason,
          cancelledBy: "customer",
        });
        summary = "Tu cita fue cancelada.";
        break;
      }
      case "reschedule": {
        requireAuthed(isAnon);
        const a = pending.args;
        await ctx.runQuery(internal.aiAgentHelpers.assertAppointmentActor, {
          userId: callerId,
          appointmentId: a.appointmentId,
          requiredActor: "customer",
        });
        await ctx.runMutation(api.appointments.requestReschedule, {
          appointmentId: { id: a.appointmentId as Appointment["_id"] },
          proposedDate: a.proposedDate,
        });
        summary = "Solicitud de reagendamiento enviada al barbero.";
        break;
      }
      case "manageAppointment": {
        requireAuthed(isAnon);
        const a = pending.args;
        await ctx.runQuery(internal.aiAgentHelpers.assertAppointmentActor, {
          userId: callerId,
          appointmentId: a.appointmentId,
          requiredActor: "shop",
        });
        if (a.status === "cancelled") {
          await ctx.runMutation(api.appointments.cancel, {
            appointmentId: { id: a.appointmentId as Appointment["_id"] },
            cancelledByUserId: callerId,
            reason: a.reason ?? "Cancelada por la barbería",
            cancelledBy: "barber",
          });
          summary = "Listo, cancelé la cita y el cliente queda avisado.";
        } else {
          // `setStatus` re-validates the finals (required per "desde" line,
          // never below the minimum), so forged card args can't undercut it.
          await ctx.runMutation(api.appointments.setStatus, {
            appointment: { id: a.appointmentId as Appointment["_id"] },
            status: a.status,
            finalPrices: a.finalPrices?.map((entry) => ({
              serviceId: entry.serviceId as Service["_id"],
              finalPrice: entry.finalPrice,
            })),
          });
          summary =
            a.status === "completed"
              ? "Marqué la cita como completada."
              : "Marqué la cita como que el cliente no asistió.";
        }
        break;
      }
      case "answerReschedule": {
        requireAuthed(isAnon);
        const a = pending.args;
        await ctx.runQuery(internal.aiAgentHelpers.assertAppointmentActor, {
          userId: callerId,
          appointmentId: a.appointmentId,
          requiredActor: "any",
        });
        await ctx.runMutation(api.appointments.answerRescheduleRequest, {
          appointment: { id: a.appointmentId as Appointment["_id"] },
          accepted: a.accept,
          answeredBy: a.answeredBy,
        });
        summary = a.accept
          ? "Listo, el cambio de hora quedó confirmado."
          : "Listo, rechacé la solicitud de cambio de hora.";
        break;
      }
      case "createService": {
        requireAuthed(isAnon);
        const a = pending.args;
        await ctx.runMutation(api.services.create, {
          name: a.name,
          price: a.price,
          priceType: a.priceType,
          duration: a.durationMinutes,
          barbershopId: a.barbershopId as Barbershop["_id"],
        });
        summary = `Listo, creé el servicio "${a.name}".`;
        break;
      }
      case "updateService": {
        requireAuthed(isAnon);
        const a = pending.args;
        const data: {
          name?: string;
          price?: number;
          priceType?: "fixed" | "starting";
          duration?: number;
          barbershopId: Barbershop["_id"];
        } = { barbershopId: a.barbershopId as Barbershop["_id"] };
        if (a.name !== undefined) data.name = a.name;
        if (a.price !== undefined) data.price = a.price;
        if (a.priceType !== undefined) data.priceType = a.priceType;
        if (a.durationMinutes !== undefined) data.duration = a.durationMinutes;
        await ctx.runMutation(api.services.update, {
          id: a.serviceId as Service["_id"],
          data,
        });
        summary = "Listo, actualicé el servicio.";
        break;
      }
      case "deleteService": {
        requireAuthed(isAnon);
        const a = pending.args;
        await ctx.runMutation(api.services.deleteService, {
          barbershop: { id: a.barbershopId as Barbershop["_id"] },
          service: { id: a.serviceId as Service["_id"] },
          force: true,
        });
        summary = "Listo, eliminé el servicio.";
        break;
      }
      case "updateBarberSchedule": {
        requireAuthed(isAnon);
        const a = pending.args;
        await ctx.runMutation(api.barbershopMembers.updateBarberSchedule, {
          barbershopMemberId: a.barbershopMemberId as BarbershopMember["_id"],
          availability: a.availability.map((d) => ({
            weekDay: { day: d.day, isActive: d.isActive },
            openAt: d.openAt,
            closeAt: d.closeAt,
            lunchStart: d.lunchStart,
            lunchEnd: d.lunchEnd,
          })),
        });
        summary = "Listo, actualicé el horario.";
        break;
      }
      case "inviteMember": {
        requireAuthed(isAnon);
        const a = pending.args;
        await ctx.runAction(api.invitations.invite, {
          email: a.email,
          roles: [a.role],
        });
        summary = `Listo, envié la invitación a ${a.email}.`;
        break;
      }
      case "removeMember": {
        requireAuthed(isAnon);
        const a = pending.args;
        if (a.kind === "barber") {
          await ctx.runMutation(
            api.barbershopMembers.removeBarberFromBarbershop,
            {
              id: a.barbershopMemberId as BarbershopMember["_id"],
              force: true,
            },
          );
        } else {
          await ctx.runMutation(
            api.barbershopMembers.removeStaffFromBarbershop,
            { id: a.barbershopMemberId as BarbershopMember["_id"] },
          );
        }
        summary = "Listo, quité a la persona del equipo.";
        break;
      }
      default:
        throw new ConvexError("Esa acción no está soportada.");
    }

    // Confirming posts the user's "Confirmar" as a new turn, then Pana's
    // acknowledgment. A user message advances the thread to a new turn (an
    // assistant message would just merge into the proposal's own turn), so the
    // proposal stops being the last message and its buttons disappear. The
    // decision lives in the conversation itself — no separate state needed.
    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: callerId,
      message: { role: "user", content: "Confirmar" },
    });
    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: callerId,
      message: { role: "assistant", content: summary },
      agentName: "Pana",
    });

    await track(ctx, {
      distinctId: callerId,
      event: "ai_action_confirmed",
      properties: { action: pending.action, isAnon },
    });
  },
});

export const rejectPendingAction = zAction({
  args: z.object({
    threadId: z.string(),
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);
    await authorizeThreadAccess(ctx, args.threadId, callerId);

    // Same as confirm: the user's "Cancelar" advances the thread to a new turn,
    // retiring the proposal card's buttons.
    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: callerId,
      message: { role: "user", content: "Cancelar" },
    });
    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: callerId,
      message: {
        role: "assistant",
        content:
          "Listo, dejo esa acción. ¿Quieres que ajuste algo o lo intentamos de otra forma?",
      },
      agentName: "Pana",
    });
  },
});

/**
 * Client-facing gate for the Pana chat. Tells the UI whether the current user
 * is a barbershop member and, if so, whether the barbershop's plan unlocks the
 * management capabilities. Customers (authenticated or anonymous) are never
 * gated — they use Pana freely. Access is derived from the barbershop owner's
 * plan, the same source the AI's system prompt uses.
 */
export const getPanaAccess = zQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return { isShopMember: false, canManage: true, isOwner: false };
    }

    return await resolvePanaAccessForUserId(ctx, userId);
  },
});
