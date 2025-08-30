import { createBackend } from "@/config";
import { createOpenApiConfig } from "@/config/openapi";
import { authRouter } from "@/routes/auth";
import { barbershopRouter } from "@/routes/barbershop";

const app = createBackend().basePath("/api");

createOpenApiConfig(app);

const routes = [barbershopRouter, authRouter] as const;

for (const route of routes) {
  app.route("/", route);
}

export type AppBackend = (typeof routes)[number];

export default app;
