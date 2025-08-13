import type { ZodType } from "zod";

export function jsonContent<T extends ZodType>(schema: T, description: string) {
  return {
    content: {
      "application/json": {
        schema,
      },
    },
    description,
  };
}

export function requiredJsonContent<T extends ZodType>(
  schema: T,
  description: string,
) {
  return {
    ...jsonContent(schema, description),
    required: true,
  };
}
