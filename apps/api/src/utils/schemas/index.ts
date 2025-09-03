import { object, string } from "zod";

export const uuidParamsSchema = object({
  uuid: string()
    .uuid()
    .openapi({
      param: {
        name: "uuid",
        in: "path",
        description: "The UUID of the resource",
      },
    }),
});

export const uuidQuerySchema = object({
  uuid: string()
    .uuid()
    .openapi({
      param: {
        name: "uuid",
        in: "query",
        description: "The UUID of the resource",
      },
    }),
});
