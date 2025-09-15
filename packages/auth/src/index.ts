import { expo } from "@better-auth/expo";
import { APP_NAME } from "@panabarbero/constants";
import { db } from "@panabarbero/db/client";
import * as schema from "@panabarbero/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  lastLoginMethod,
  oAuthProxy,
  openAPI,
  organization,
  twoFactor,
} from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";

import { authClientEnv } from "../env/client";
import { authServerEnv } from "../env/server";
import { ac, roles } from "./rbac";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: authClientEnv.NEXT_PUBLIC_API_URL,
  secret: authServerEnv.BETTER_AUTH_SECRET,
  plugins: [
    oAuthProxy({
      currentURL: `https://${authClientEnv.VERCEL_BRANCH_URL}`,
      productionURL: authClientEnv.NEXT_PUBLIC_API_URL,
    }),
    passkey(),
    organization({
      ac,
      roles,
      defaultRole: roles.barber,
      creatorRole: "owner",
    }),
    twoFactor({
      issuer: APP_NAME,
    }),
    expo(),
    openAPI(),
    lastLoginMethod(),
  ],
  socialProviders: {
    google: {
      clientId: authServerEnv.GOOGLE_CLIENT_ID,
      clientSecret: authServerEnv.GOOGLE_CLIENT_SECRET,
    },
  },
  appName: APP_NAME,
  trustedOrigins: [
    "expo://",
    authClientEnv.NEXT_PUBLIC_API_URL,
    `https://${authClientEnv.VERCEL_BRANCH_URL}`,
  ],
  user: {
    additionalFields: {
      role: {
        type: schema.role.enumValues,
        required: false,
        defaultValue: schema.role.enumValues[2],
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"]["session"];
export type User = Auth["$Infer"]["Session"]["user"];
