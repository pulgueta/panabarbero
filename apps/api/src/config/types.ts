/** biome-ignore-all lint/complexity/noBannedTypes: Required */
import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Session, User } from "@panabarbero/auth";
import type { Schema } from "hono";

export type AppBindings = {
  Variables: {
    user: User | null;
    session: Session | null;
  };
};

export type ApiContext<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;
export type ApiHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
