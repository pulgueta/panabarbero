import { number, object, string } from "zod";

export const reviewFormSchema = object({
  rating: number()
    .min(1, "Calificación mínima es 1")
    .max(5, "Calificación máxima es 5"),
  comment: string().optional(),
});
