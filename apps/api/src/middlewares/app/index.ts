import { STATUS_CODES } from "@panabarbero/constants";
import type { Context } from "hono";

export function notFound(c: Context) {
  return c.json(
    {
      path: c.req.path,
      message: "Not found",
    },
    STATUS_CODES.NOT_FOUND,
  );
}
