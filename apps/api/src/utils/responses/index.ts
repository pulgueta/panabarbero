import type { z } from "@hono/zod-openapi";
import { array, boolean, number, object, string, union } from "zod";

import { jsonContent } from "../parsers/json";

export type AppZodSchema = z.ZodUnion | z.ZodObject | z.ZodArray<z.ZodObject>;
export type AppZodIssue = z.ZodIssue;

export function createErrorSchema<T extends AppZodSchema>(
  schema: T,
  description: string,
) {
  const { error } = schema.safeParse(schema.def.type === "array" ? [] : {});

  const example = error
    ? {
        name: error.name,
        issues: error.issues.map((issue: AppZodIssue) => ({
          code: issue.code,
          path: issue.path,
          message: issue.message,
        })),
      }
    : {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: ["fieldName"],
            message: "Expected string, received undefined",
          },
        ],
      };

  return jsonContent(
    object({
      success: boolean().openapi({
        example: false,
      }),
      error: object({
        issues: array(
          object({
            code: string(),
            path: array(union([string(), number()])),
            message: string().optional(),
          }),
        ),
        name: string(),
      }).openapi({
        example,
      }),
    }),
    description,
  );
}

export function defaultResponse<Message extends string>(message: Message) {
  return jsonContent(
    object({
      message: string(),
    }),
    message,
  );
}
