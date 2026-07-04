import { ConvexError } from "convex/values";

import { errorMessages } from "../../convex/errors";

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

  return "Ha ocurrido un error al procesar la solicitud.";
}

export function getConvexErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    return messageFromConvexData(error.data);
  }

  return "Ha ocurrido un error al procesar la solicitud.";
}
