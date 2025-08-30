import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const notificationsRouter = createBackendRouter()
  .openapi(routes.createNotification, handlers.createNotification)
  .openapi(routes.getNotification, handlers.getNotification)
  .openapi(routes.getNotifications, handlers.getNotifications)
  .openapi(routes.updateNotification, handlers.updateNotification)
  .openapi(routes.deleteNotification, handlers.deleteNotification);
