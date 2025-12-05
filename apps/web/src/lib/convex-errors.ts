import { ConvexError } from "convex/values";

export function getConvexErrorMessage(error: unknown) {
  if (error instanceof ConvexError) {
    return error.data;
  }

  return "Ha ocurrido un error al procesar la solicitud.";
}
