import { createBackendRouter } from "@/config";
import { appointmentsRouter } from "./appointments";
import * as handlers from "./handlers";
import { reviewsRouter } from "./reviews";
import * as routes from "./routes";
import { servicesRouter } from "./services";

export const barbershopRouter = createBackendRouter()
  .openapi(routes.createBarbershop, handlers.createBarbershop)
  .openapi(routes.getBarbershop, handlers.getBarbershop)
  .openapi(routes.getBarbershops, handlers.getBarbershops)
  .openapi(routes.updateBarbershop, handlers.updateBarbershop)
  .openapi(routes.deleteBarbershop, handlers.deleteBarbershop)
  .route("/barbershops", appointmentsRouter)
  .route("/barbershops", servicesRouter)
  .route("/barbershops", reviewsRouter);
