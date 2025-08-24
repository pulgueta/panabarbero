import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type { output } from "zod";

import { barbershops } from "../schema";

export const createBarbershopSchema = createInsertSchema(barbershops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
});
export const updateBarbershopSchema = createUpdateSchema(barbershops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
});

export const barbershopsSchema = createSelectSchema(barbershops);

export type CreateBarbershop = output<typeof createBarbershopSchema>;
export type UpdateBarbershop = output<typeof updateBarbershopSchema>;
export type Barbershop = output<typeof barbershopsSchema>;
