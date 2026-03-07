import { Twilio } from "@convex-dev/twilio";
import { z } from "zod";

import { zInternalAction } from ".";
import { components } from "./_generated/api";

const defaultFrom = process.env.TWILIO_PHONE_NUMBER ?? "";

export const twilio = new Twilio(components.twilio, {
  defaultFrom,
});

export const sendSms = zInternalAction({
  args: z.object({
    body: z.string(),
    to: z.string(),
  }),
  handler: async (ctx, args) => {
    return await twilio.sendMessage(ctx, {
      to: `+57${args.to}`,
      from: defaultFrom,
      body: args.body,
    });
  },
});
