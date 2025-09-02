import { createBackend } from "@/config";
import { createOpenApiConfig } from "@/config/openapi";
import { authRouter } from "@/routes/auth";
import { barbersRouter } from "@/routes/barbers";
import { barbershopRouter } from "@/routes/barbershop";
import { notificationsRouter } from "@/routes/notifications";
import { paymentsRouter } from "@/routes/payments";
import { pushTokensRouter } from "@/routes/push-tokens";

// Reviews are now chained under barbershops

// Services and appointments are now chained under barbershops

const app = createBackend().basePath("/api");

createOpenApiConfig(app);

const routes = [
  barbershopRouter,
  barbersRouter,
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
