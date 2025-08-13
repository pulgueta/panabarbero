import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants";
import { object, string } from "zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";

export const createBarbershop = createRoute({
  method: "post",
  path: "/barbershop",
  request: {
    body: requiredJsonContent(
      object({
        name: string(),
        address: string(),
        city: string(),
        state: string(),
        zip: string(),
      }),
      "Barbershop to create",
    ),
  },
  responses: {
    [STATUS_CODES.CREATED]: jsonContent(
      object({
        id: string(),
      }),
      "Barbershop created",
    ),
  },
});

export type CreateRoute = typeof createBarbershop;
