import { SQL } from "bun";

import { drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema";

export const db = drizzle({
  client: new SQL(process.env.POSTGRES_URL ?? ""),
  schema,
  casing: "snake_case",
  logger: true
});
