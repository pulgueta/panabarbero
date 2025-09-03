import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const barbersRouter = createBackendRouter()
  .openapi(routes.createBarber, handlers.createBarber)
  .openapi(routes.getBarber, handlers.getBarber)
  .openapi(routes.getBarbers, handlers.getBarbers)
  .openapi(routes.updateBarber, handlers.updateBarber)
  .openapi(routes.deleteBarber, handlers.deleteBarber);
