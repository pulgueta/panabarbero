import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const appointmentsRouter = createBackendRouter()
  .openapi(routes.createAppointment, handlers.createAppointment)
  .openapi(routes.getAppointment, handlers.getAppointment)
  .openapi(routes.getAppointments, handlers.getAppointments)
  .openapi(routes.updateAppointment, handlers.updateAppointment)
  .openapi(routes.deleteAppointment, handlers.deleteAppointment);
