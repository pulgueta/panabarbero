import type { RunMutationCtx } from "@convex-dev/rate-limiter";
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import { errorMessages } from "./errors";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  authWrite: { kind: "fixed window", rate: 10, period: 60 * MINUTE },
  requestReschedule: { kind: "fixed window", rate: 1, period: 30 * MINUTE },
  createAppointment: {
    kind: "token bucket",
    rate: 3,
    period: MINUTE,
    capacity: 3,
  },
  setAppointmentStatus: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  deleteAppointment: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  cancelAppointment: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  answerRescheduleRequest: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  createBarbershop: { kind: "fixed window", rate: 2, period: 60 * MINUTE },
  updateBarbershop: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  updateBarbershopAvailability: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  updateBarbershopDayAvailability: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  deleteBarbershopCascade: {
    kind: "fixed window",
    rate: 2,
    period: 10 * MINUTE,
  },
  updateBarbershopMember: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  removeBarberFromBarbershop: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  updateBarberSchedule: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  inviteBarbershopMember: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  searchServices: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 30,
  },
  createService: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  updateService: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  deleteService: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  setBarberServices: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  createReview: { kind: "fixed window", rate: 3, period: MINUTE },
  updateReview: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  deleteReview: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  deleteR2Object: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  updateName: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  updatePhoneNumber: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  updateNotificationPreference: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 20,
  },
  setProfilePhotoKey: {
    kind: "token bucket",
    rate: 3,
    period: MINUTE,
    capacity: 3,
  },
  removeProfilePhoto: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  toggleBarberRole: { kind: "fixed window", rate: 3, period: 10 * MINUTE },
  uploadBarbershopLogo: { kind: "fixed window", rate: 5, period: 60 * MINUTE },
  removeBarbershopLogo: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  removeStaffFromBarbershop: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  r2: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  aiSendMessage: {
    kind: "fixed window",
    period: 5 * 1000,
    rate: 1,
    capacity: 5,
  },
  aiSendMessageAnon: {
    kind: "fixed window",
    period: 15 * 1000,
    rate: 1,
    capacity: 3,
  },
  aiTokenUsage: {
    kind: "token bucket",
    period: MINUTE,
    rate: 5_000,
    capacity: 20_000,
  },
  aiTokenUsageAnon: {
    kind: "token bucket",
    period: MINUTE,
    rate: 2_000,
    capacity: 6_000,
  },
  createInventoryItem: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  updateInventoryItem: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  archiveInventoryItem: { kind: "fixed window", rate: 5, period: 10 * MINUTE },
  receiveStock: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  adjustStock: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  recordConsumption: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 15,
  },
  recordSale: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 15,
  },
  reserveStock: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  setServiceRecipe: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
});

export type RateLimitName = keyof NonNullable<typeof rateLimiter.limits>;

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
