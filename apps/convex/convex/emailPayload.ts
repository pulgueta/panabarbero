import type { Infer } from "convex/values";
import { v } from "convex/values";

import type { Notification } from "./tables";

const appointmentReminderPayloadValidator = v.object({
  type: v.literal("appointment_reminder"),
  props: v.object({
    barbershopName: v.string(),
  }),
});

const appointmentRescheduledPayloadValidator = v.object({
  type: v.literal("appointment_rescheduled"),
  props: v.object({
    appointmentDate: v.string(),
    appointmentTime: v.string(),
    service: v.string(),
  }),
});

const noPropsPayloadValidator = <T extends Notification["reason"]>(type: T) =>
  v.object({
    type: v.literal(type),
    props: v.object({}),
  });

export const emailPayloadValidator = v.union(
  appointmentReminderPayloadValidator,
  appointmentRescheduledPayloadValidator,
  noPropsPayloadValidator("appointment_cancelled"),
  noPropsPayloadValidator("appointment_rescheduled_request"),
  noPropsPayloadValidator("appointment_no_show"),
  noPropsPayloadValidator("appointment_confirmed"),
  noPropsPayloadValidator("appointment_rescheduled_accepted"),
  noPropsPayloadValidator("appointment_rescheduled_denied"),
  noPropsPayloadValidator("appointment_created"),
  noPropsPayloadValidator("barber_invited"),
);

export type EmailPayload = Infer<typeof emailPayloadValidator>;
