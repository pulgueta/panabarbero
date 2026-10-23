import type { Id, TableNames } from "@convex/_generated/dataModel";

/** Brand a route param as a Convex document ID. */
export function asConvexId<TableName extends TableNames>(
  value: string,
): Id<TableName> {
  // SAFETY: route params are plain strings; Convex validates the ID and its table when a function receives it.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the Id brand exists only at type level; Convex validates the value server-side
  return value as Id<TableName>;
}
