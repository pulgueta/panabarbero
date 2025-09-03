import { createBackendRouter } from "@/config";
import * as handlers from "./handlers";
import * as routes from "./routes";

export const reviewsRouter = createBackendRouter()
  .openapi(routes.createReview, handlers.createReview)
  .openapi(routes.getReview, handlers.getReview)
  .openapi(routes.getReviews, handlers.getReviews)
  .openapi(routes.updateReview, handlers.updateReview)
  .openapi(routes.deleteReview, handlers.deleteReview);
