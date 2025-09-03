import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";
import { array, object, string } from "zod";

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

export function oneOf<T extends ZodType>(schemas: T[]) {
  const registry = new OpenAPIRegistry();

  schemas.forEach((schema, index) => {
    registry.register(index.toString(), schema);
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const components = generator.generateComponents();

  if (!components.components?.schemas) {
    throw new Error("No schemas found");
  }

  return Object.values(components.components.schemas);
}

export const errorResponseSchema = object({
  error: string(),
  details: array(
    object({
      path: string(),
      message: string(),
    }),
  ),
});
