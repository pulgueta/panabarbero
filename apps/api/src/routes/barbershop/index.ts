import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const barbershopRouter = createBackendRouter().openapi(
  routes.createBarbershop,
  handlers.createBarbershop,
);
