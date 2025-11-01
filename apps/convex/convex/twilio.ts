import { Twilio } from "@convex-dev/twilio";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";

const defaultFrom = process.env.TWILIO_PHONE_NUMBER ?? "";

export const twilio = new Twilio(components.twilio, {
  defaultFrom,
});

export const sendSms = internalAction({
  args: {
    body: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.sendMessage(ctx, {
      to: `+57${args.to}`,
      from: defaultFrom,
      body: args.body,
    });
  },
});
