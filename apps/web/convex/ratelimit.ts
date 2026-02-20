import type { RunMutationCtx } from "@convex-dev/rate-limiter";
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import { errorMessages } from "./errors";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  requestReschedule: { kind: "fixed window", rate: 1, period: 30 * MINUTE },
  createAppointment: { kind: "fixed window", rate: 3, period: MINUTE },
  setAppointmentStatus: { kind: "fixed window", rate: 10, period: MINUTE },
  deleteAppointment: { kind: "fixed window", rate: 5, period: MINUTE },
  removeAppointment: { kind: "fixed window", rate: 5, period: MINUTE },
  cancelAppointment: { kind: "fixed window", rate: 5, period: MINUTE },
  answerRescheduleRequest: { kind: "fixed window", rate: 5, period: MINUTE },
  createBarbershop: { kind: "fixed window", rate: 2, period: 60 * MINUTE },
  updateBarbershop: { kind: "fixed window", rate: 10, period: MINUTE },
  updateBarbershopAvailability: {
    kind: "fixed window",
    rate: 10,
    period: MINUTE,
  },
  updateBarbershopDayAvailability: {
    kind: "fixed window",
    rate: 10,
    period: MINUTE,
  },
  deleteBarbershopCascade: {
    kind: "fixed window",
    rate: 2,
    period: 10 * MINUTE,
  },
  updateBarbershopMember: { kind: "fixed window", rate: 10, period: MINUTE },
  removeBarberFromBarbershop: { kind: "fixed window", rate: 5, period: MINUTE },
  inviteBarbershopMember: { kind: "fixed window", rate: 5, period: MINUTE },
  validateInvitation: { kind: "fixed window", rate: 10, period: MINUTE },
  answerInvitation: { kind: "fixed window", rate: 10, period: MINUTE },
  searchServices: { kind: "fixed window", rate: 30, period: MINUTE },
  createService: { kind: "fixed window", rate: 10, period: MINUTE },
  updateService: { kind: "fixed window", rate: 10, period: MINUTE },
  deleteService: { kind: "fixed window", rate: 5, period: MINUTE },
  setBarberServices: { kind: "fixed window", rate: 10, period: MINUTE },
  addServiceToBarber: { kind: "fixed window", rate: 10, period: MINUTE },
  removeServiceFromBarber: { kind: "fixed window", rate: 10, period: MINUTE },
  createReview: { kind: "fixed window", rate: 3, period: MINUTE },
  updateReview: { kind: "fixed window", rate: 5, period: MINUTE },
  deleteReview: { kind: "fixed window", rate: 5, period: MINUTE },
  deleteR2Object: { kind: "fixed window", rate: 5, period: MINUTE },
  updateName: { kind: "fixed window", rate: 5, period: MINUTE },
  updateEmail: { kind: "fixed window", rate: 3, period: MINUTE },
  updatePhoneNumber: { kind: "fixed window", rate: 5, period: MINUTE },
  updateNotificationPreference: {
    kind: "fixed window",
    rate: 20,
    period: MINUTE,
  },
  setProfilePhotoKey: { kind: "fixed window", rate: 3, period: MINUTE },
  removeProfilePhoto: { kind: "fixed window", rate: 5, period: MINUTE },
});

type RateLimitName = keyof NonNullable<typeof rateLimiter.limits>;

export const rateLimitOrThrow = async (
  ctx: RunMutationCtx,
  name: RateLimitName,
  key: string,
) => {
  const { ok } = await rateLimiter.limit(ctx, name, { key });

  if (!ok) {
    throw new ConvexError(errorMessages.rateLimitExceeded);
  }
};
