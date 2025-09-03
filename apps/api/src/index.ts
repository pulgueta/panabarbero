import { createBackend } from "@/config";
import { createOpenApiConfig } from "@/config/openapi";
import { authRouter } from "@/routes/auth";
import { barbershopRouter } from "@/routes/barbershop";
import { notificationsRouter } from "@/routes/notifications";
import { paymentsRouter } from "@/routes/payments";
import { pushTokensRouter } from "@/routes/push-tokens";

const app = createBackend().basePath("/api");

createOpenApiConfig(app);

const routes = [
  barbershopRouter,
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
