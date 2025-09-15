import type { output } from "zod";
import { literal, object, string, uuid } from "zod";

export const uuidParamsSchema = object({
  uuid: uuid().openapi({
    param: {
      name: "uuid",
      in: "path",
      description: "The UUID of the resource",
    },
  }),
});

export const uuidQuerySchema = object({
  uuid: uuid().openapi({
    param: {
      name: "uuid",
      in: "query",
      description: "The UUID of the resource",
    },
  }),
});

export const filtersSchema = object({
  cursor: string().optional(),
  orderBy: literal(["created_at", "updated_at"]).default("updated_at"),
});

export type FiltersSchema = output<typeof filtersSchema>;
