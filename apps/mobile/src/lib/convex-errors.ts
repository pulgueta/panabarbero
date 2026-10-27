import { errorMessages } from "@panabarbero/backend/convex/errors";
import { ConvexError } from "convex/values";

const FALLBACK_MESSAGE = "Ha ocurrido un error al procesar la solicitud.";

function messageFromConvexData(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object" && data !== null && "ZodError" in data) {
    const issues = (data as { ZodError?: { message?: string }[] }).ZodError;

    if (Array.isArray(issues) && issues.length > 0) {
      return issues[0]?.message ?? errorMessages.invalidQuantity;
    }
  }

  return FALLBACK_MESSAGE;
}

/** User-facing Spanish message for an error thrown by a Convex function. */
export function getConvexErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    return messageFromConvexData(error.data);
  }

  return FALLBACK_MESSAGE;
}
