import type { PgTable, SQLWrapper } from "@panabarbero/db";
import { and, gt } from "@panabarbero/db";

import type { FiltersSchema } from "./schemas";

// biome-ignore lint/suspicious/noExplicitAny: Required by Drizzle
export function getQueryConditions<T extends PgTable<any> & { id: any }>(
  table: T,
  filters: FiltersSchema,
) {
  const whereClauses: SQLWrapper[] = [];

  if (filters.cursor) {
    whereClauses.push(gt(table.id, filters.cursor));
  }

  return and(...whereClauses);
}
