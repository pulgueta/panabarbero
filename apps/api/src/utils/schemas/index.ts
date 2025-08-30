import { object, string } from "zod";

export const idParamsSchema = object({
  id: string().openapi({
    param: {
      name: "id",
      in: "path",
      description: "The id of the resource",
    },
  }),
});
