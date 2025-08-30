import type { Hook } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants";
import type { Context } from "hono";

export function notFound(c: Context) {
  return c.json(
    {
      path: c.req.path,
      message: "The requested resource was not found",
    },
    STATUS_CODES.NOT_FOUND,
  );
}

// biome-ignore lint/suspicious/noExplicitAny: Required by Hono
export const defaultHookHandler: Hook<any, any, any, any> = (res, c) => {
  if (!res.success) {
    return c.json(
      {
        success: res.success,
        error: res.error,
      },
      STATUS_CODES.UNPROCESSABLE_ENTITY,
    );
  }
};
