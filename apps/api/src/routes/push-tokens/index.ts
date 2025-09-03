import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const pushTokensRouter = createBackendRouter()
  .openapi(routes.createMobilePushToken, handlers.createMobilePushToken)
  .openapi(routes.getMobilePushToken, handlers.getMobilePushToken)
  .openapi(routes.getMobilePushTokens, handlers.getMobilePushTokens)
  .openapi(routes.updateMobilePushToken, handlers.updateMobilePushToken)
  .openapi(routes.deleteMobilePushToken, handlers.deleteMobilePushToken);
