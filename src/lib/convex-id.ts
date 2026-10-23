import type { Id, TableNames } from "@convex/_generated/dataModel";

/** Brand a route param as a Convex document ID. */
export function asConvexId<TableName extends TableNames>(
  value: string,
): Id<TableName> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: route params are plain strings; Convex validates the ID and its table when a function receives it.
  return value as Id<TableName>;
}
