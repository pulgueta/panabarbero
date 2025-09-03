import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const servicesRouter = createBackendRouter()
  .openapi(routes.createService, handlers.createService)
  .openapi(routes.getService, handlers.getService)
  .openapi(routes.getServices, handlers.getServices)
  .openapi(routes.updateService, handlers.updateService)
  .openapi(routes.deleteService, handlers.deleteService);
