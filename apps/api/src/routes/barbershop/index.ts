import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const barbershopRouter = createBackendRouter()
  .openapi(routes.createBarbershop, handlers.createBarbershop)
  .openapi(routes.getBarbershop, handlers.getBarbershop)
  .openapi(routes.getBarbershops, handlers.getBarbershops)
  .openapi(routes.updateBarbershop, handlers.updateBarbershop)
  .openapi(routes.deleteBarbershop, handlers.deleteBarbershop);
