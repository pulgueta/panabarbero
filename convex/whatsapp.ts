import { createFunctionHandle, type FunctionHandle } from "convex/server";
import { WhatsApp } from "convex-whatsapp";
import { z } from "zod";

import { zInternalAction, zInternalMutation } from ".";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  buildRescheduleRequestTemplateComponents,
  buildTextTemplateComponents,
  getWhatsAppReplyId,
  parseWhatsAppActionId,
} from "./whatsappNotificationCore";

export const whatsapp = new WhatsApp(components.whatsapp);

export const registerInboundHandler = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const handle = await createFunctionHandle(
      internal.whatsapp.onInboundMessage,
    );

    await whatsapp.registerInboundHandler(
      ctx,
      handle as FunctionHandle<"mutation">,
    );
  },
});

export const sendNotification = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
    template: z.object({
      name: z.string(),
      language: z.string(),
    }),
    rescheduleAction: z
      .object({
        appointmentId: z.string(),
        proposedAt: z.number(),
        role: z.enum(["customer", "barber"]),
      })
      .optional(),
  }),
  handler: async (ctx, args) => {
    const components = args.rescheduleAction
      ? buildRescheduleRequestTemplateComponents({
          appointmentId: args.rescheduleAction.appointmentId,
          body: args.body,
          proposedAt: args.rescheduleAction.proposedAt,
          role: args.rescheduleAction.role,
        })
      : buildTextTemplateComponents(args.body);

    return await whatsapp.send(ctx, {
      to: args.to,
      type: "template",
      template: {
        name: args.template.name,
        language: args.template.language,
        components,
      },
    });
  },
});

export const onInboundMessage = zInternalMutation({
  args: z.object({
    messageId: z.string(),
  }),
  handler: async (ctx, args) => {
    const message = await whatsapp.getMessage(ctx, args.messageId);

    if (!message || message.direction !== "inbound") {
      return;
    }

    const replyId = getWhatsAppReplyId(message.payload);
    const action = replyId ? parseWhatsAppActionId(replyId) : null;

    if (!action) {
      return;
    }

    await ctx.runMutation(
      internal.appointments.answerRescheduleRequestFromWhatsApp,
      {
        appointmentId: action.appointmentId as Id<"appointments">,
        accepted: action.action === "accept",
        answeredBy: action.role,
        proposedAt: action.proposedAt,
        senderPhone: message.from,
      },
    );
  },
});
