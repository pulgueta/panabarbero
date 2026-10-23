import { ConvexError } from "convex/values";
import { z } from "zod";

import { errorMessages } from "../../convex/errors";

const genericErrorMessage = "Ha ocurrido un error al procesar la solicitud.";

const zodErrorDataSchema = z.object({
  ZodError: z.array(
    z.object({ message: z.string().optional().catch(undefined) }).catch({}),
  ),
});

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- receives catch-clause values, which are `unknown` by definition
export function getConvexErrorMessage(error: unknown): string {
  if (!(error instanceof ConvexError)) {
    return genericErrorMessage;
  }

  const text = z.string().safeParse(error.data);

  if (text.success) {
    return text.data;
  }

  const zodError = zodErrorDataSchema.safeParse(error.data);

  if (zodError.success && zodError.data.ZodError.length > 0) {
    return zodError.data.ZodError[0]?.message ?? errorMessages.invalidQuantity;
  }

  return genericErrorMessage;
}
