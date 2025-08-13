import { initAuth } from "@panabarbero/auth";
import { serverEnv } from "@panabarbero/auth/env-server";

import type { ApiContext } from "@/config/types";
import { env } from "@/env";

export function authMiddleware(ctx: ApiContext) {
  const auth = initAuth({
    baseUrl: env.API_URL,
    productionUrl: env.API_URL,
    secret: serverEnv.AUTH_SECRET,
    discordClientId: "",
    discordClientSecret: "",
  });

  ctx.on(["POST", "GET"], "/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  ctx.use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      c.set("user", null);
      c.set("session", null);

      return next();
    }

    c.set("user", session.user);
    c.set("session", session.session);

    return next();
  });

  ctx.get("/auth/session", (c) => {
    const session = c.get("session");
    const user = c.get("user");

    if (!user) return c.body(null, 401);

    return c.json({
      session,
      user,
    });
  });
}
