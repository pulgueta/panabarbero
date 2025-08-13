import { createBackend } from "@/config";
import { createOpenApiConfig } from "@/config/openapi";
import { authMiddleware } from "@/middlewares/auth";
import { barbershopRouter } from "@/routes/barbershop";

const app = createBackend().basePath("/api");

createOpenApiConfig(app);
authMiddleware(app);

const routes = [barbershopRouter] as const;

for (const route of routes) {
  app.route("/", route);
}

export type AppBackend = typeof routes;

export default app;
