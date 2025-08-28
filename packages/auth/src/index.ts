import { expo } from "@better-auth/expo";
import { APP_NAME } from "@panabarbero/constants";
import { db } from "@panabarbero/db/client";
import * as schema from "@panabarbero/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  oAuthProxy,
  openAPI,
  organization,
  twoFactor,
} from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";

import { clientEnv } from "@/env/client";
import { serverEnv } from "@/env/server";
import { ac, roles } from "./rbac";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: clientEnv.VITE_API_URL,
  secret: serverEnv.AUTH_SECRET,
  plugins: [
    oAuthProxy({
      currentURL: clientEnv.VITE_API_URL,
      productionURL: clientEnv.VITE_API_URL,
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
  ],
  socialProviders: {
    google: {
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    },
  },
  appName: APP_NAME,
  trustedOrigins: ["expo://", "http://localhost:5173", clientEnv.VITE_API_URL],
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
