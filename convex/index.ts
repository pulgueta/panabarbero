import { NoOp } from "convex-helpers/server/customFunctions";
import {
  zCustomAction,
  zCustomMutation,
  zCustomQuery,
  zid,
  zodToConvex,
} from "convex-helpers/server/zod4";
import { defineTable } from "convex/server";
import type { GenericId } from "convex/values";
import { z } from "zod";

import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

export const zQuery = zCustomQuery(query, NoOp);
export const zInternalQuery = zCustomQuery(internalQuery, NoOp);
export const zMutation = zCustomMutation(mutation, NoOp);
export const zInternalMutation = zCustomMutation(internalMutation, NoOp);
export const zAction = zCustomAction(action, NoOp);
export const zInternalAction = zCustomAction(internalAction, NoOp);

function jsonSafeZid<TableName extends string>(
  tableName: TableName,
): z.ZodType<GenericId<TableName>> {
  return z.string().describe(`Convex Id<${tableName}>`) as unknown as z.ZodType<
    GenericId<TableName>
  >;
}

// Taken from https://gist.github.com/ImRLopezAI/13294581f3ed8e8478befe1bb664b690
export function zodTable<
  Table extends string,
  T extends { [key: string]: z.ZodType },
>(tableName: Table, schema: (id: typeof zid) => T) {
  const fullSchema = z.object({
    ...schema(zid),
    _id: zid(tableName),
    _creationTime: z.number(),
  });

  const toolSafeFullSchema = z.object({
    ...schema(jsonSafeZid as typeof zid),
    _id: jsonSafeZid(tableName),
    _creationTime: z.number(),
  });

  const insertSchema = fullSchema.omit({
    _id: true,
    _creationTime: true,
  });
  const updateSchema = insertSchema.partial();

  const toolInsertSchema = toolSafeFullSchema.omit({
    _id: true,
    _creationTime: true,
  });
  const toolUpdateSchema = toolInsertSchema.partial();

  return {
    tableName,
    schema: fullSchema,
    insertSchema,
    updateSchema,
    table: () => {
      return defineTable(zodToConvex(insertSchema));
    },
    insert: () => zodToConvex(insertSchema),
    update: () => zodToConvex(updateSchema),
    tools: {
      insert: toolInsertSchema,
      update: z.object({
        data: toolUpdateSchema,
        id: jsonSafeZid(tableName),
      }),
      id: z.object({
        id: jsonSafeZid(tableName),
      }),
    },
  };
}
