import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const commonRows = {
  id: text()
    .notNull()
    .primaryKey()
    .unique()
    .$defaultFn(() => Bun.randomUUIDv7()),
  uuid: uuid().notNull().unique().defaultRandom(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp({ mode: "date", withTimezone: true }).$onUpdateFn(
    () => new Date()
  ),
};

export const barbershop = pgTable("barbershop", (t) => ({
  ...commonRows,
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
}));

export * from "./auth-schema";
