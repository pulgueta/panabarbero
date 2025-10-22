import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  requestReschedule: { kind: "fixed window", rate: 1, period: 30 * MINUTE },
});
