import { Twilio } from "@convex-dev/twilio";
import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalAction } from ".";
import { components } from "./_generated/api";
import { errorMessages } from "./errors";
import { formatPhoneNumber } from "./utils";

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
    const to = args.to.trim() ? formatPhoneNumber(args.to) : "";
    if (!to) {
      throw new ConvexError(errorMessages.invalidPhoneNumber);
    }

    return await twilio.sendMessage(ctx, {
      to,
      from: defaultFrom,
      body: args.body,
    });
  },
});
