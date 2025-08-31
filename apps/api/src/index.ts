import { createBackend } from "@/config";
import { createOpenApiConfig } from "@/config/openapi";
import { authRouter } from "@/routes/auth";
import { barbersRouter } from "@/routes/barbers";
import { barbershopRouter } from "@/routes/barbershop";
import { appointmentsRouter } from "@/routes/barbershop/appointments";
import { notificationsRouter } from "@/routes/notifications";
import { paymentsRouter } from "@/routes/payments";
import { pushTokensRouter } from "@/routes/push-tokens";
import { reviewsRouter } from "@/routes/reviews";
import { servicesRouter } from "@/routes/services";

const app = createBackend().basePath("/api");

createOpenApiConfig(app);

const routes = [
  barbershopRouter,
  barbersRouter,
  servicesRouter,
  reviewsRouter,
  appointmentsRouter,
  paymentsRouter,
  notificationsRouter,
  pushTokensRouter,
  authRouter,
] as const;

for (const route of routes) {
  app.route("/", route);
}

export type AppBackend = (typeof routes)[number];

export default app;
