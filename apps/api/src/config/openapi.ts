import { APP_NAME } from "@panabarbero/constants";
import { Scalar } from "@scalar/hono-api-reference";

import type { ApiContext } from "@/config/types";
import { env } from "@/env";
import { version } from "../../package.json" with { type: "json" };

export function createOpenApiConfig(ctx: ApiContext) {
  ctx.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: `${APP_NAME} API`,
      version,
    },
  });

  ctx.get(
    "/reference",
    Scalar({
      url: "/api/doc",
      theme: "bluePlanet",
      layout: "modern",
      defaultHttpClient: {
        clientKey: "fetch",
        targetKey: "node",
      },
      authentication:
        process.env.NODE_ENV === "production"
          ? {
              securitySchemes: {
                httpBasic: {
                  username: env.API_USERNAME,
                  password: env.API_PASSWORD,
                },
              },
            }
          : undefined,
    }),
  );
}
