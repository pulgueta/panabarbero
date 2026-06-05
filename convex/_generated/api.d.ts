/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as acl from "../acl.js";
import type * as aggregates from "../aggregates.js";
import type * as aiAgent from "../aiAgent.js";
import type * as aiAgentHelpers from "../aiAgentHelpers.js";
import type * as aiAgentTools from "../aiAgentTools.js";
import type * as aiChat from "../aiChat.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as barbershopMemberServices from "../barbershopMemberServices.js";
import type * as barbershopMembers from "../barbershopMembers.js";
import type * as barbershopMetadata from "../barbershopMetadata.js";
import type * as barbershops from "../barbershops.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as directions from "../directions.js";
import type * as emails from "../emails.js";
import type * as errors from "../errors.js";
import type * as geospatial from "../geospatial.js";
import type * as http from "../http.js";
import type * as index from "../index.js";
import type * as invitations from "../invitations.js";
import type * as migrations from "../migrations.js";
import type * as notificationCopy from "../notificationCopy.js";
import type * as notificationSubjects from "../notificationSubjects.js";
import type * as notifications from "../notifications.js";
import type * as plans from "../plans.js";
import type * as polar from "../polar.js";
import type * as r2 from "../r2.js";
import type * as ratelimit from "../ratelimit.js";
import type * as services from "../services.js";
import type * as twilio from "../twilio.js";
import type * as userProfileData from "../userProfileData.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  acl: typeof acl;
  aggregates: typeof aggregates;
  aiAgent: typeof aiAgent;
  aiAgentHelpers: typeof aiAgentHelpers;
  aiAgentTools: typeof aiAgentTools;
  aiChat: typeof aiChat;
  appointments: typeof appointments;
  auth: typeof auth;
  authz: typeof authz;
  barbershopMemberServices: typeof barbershopMemberServices;
  barbershopMembers: typeof barbershopMembers;
  barbershopMetadata: typeof barbershopMetadata;
  barbershops: typeof barbershops;
  credits: typeof credits;
  crons: typeof crons;
  directions: typeof directions;
  emails: typeof emails;
  errors: typeof errors;
  geospatial: typeof geospatial;
  http: typeof http;
  index: typeof index;
  invitations: typeof invitations;
  migrations: typeof migrations;
  notificationCopy: typeof notificationCopy;
  notificationSubjects: typeof notificationSubjects;
  notifications: typeof notifications;
  plans: typeof plans;
  polar: typeof polar;
  r2: typeof r2;
  ratelimit: typeof ratelimit;
  services: typeof services;
  twilio: typeof twilio;
  userProfileData: typeof userProfileData;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  twilio: import("@convex-dev/twilio/_generated/component.js").ComponentApi<"twilio">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  geospatial: import("@convex-dev/geospatial/_generated/component.js").ComponentApi<"geospatial">;
  inviteLinks: import("convex-invite-links/_generated/component.js").ComponentApi<"inviteLinks">;
  aggregateCompletedAppointments: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateCompletedAppointments">;
  aggregateSmsSent: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateSmsSent">;
  aggregateEmailsSent: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateEmailsSent">;
};
