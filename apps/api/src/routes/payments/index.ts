import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const paymentsRouter = createBackendRouter()
  .openapi(routes.createPayment, handlers.createPayment)
  .openapi(routes.getPayment, handlers.getPayment)
  .openapi(routes.getPayments, handlers.getPayments)
  .openapi(routes.updatePayment, handlers.updatePayment)
  .openapi(routes.deletePayment, handlers.deletePayment);
