import { initAuth } from "@panabarbero/auth";
import { serverEnv } from "@panabarbero/auth/env-server";

import { env } from "@/env";

export const auth = initAuth({
  baseUrl: env.API_URL,
  productionUrl: env.API_URL,
  secret: serverEnv.AUTH_SECRET,
  discordClientId: "",
  discordClientSecret: "",
});
