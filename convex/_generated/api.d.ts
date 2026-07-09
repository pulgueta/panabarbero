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
import type * as aiRag from "../aiRag.js";
import type * as aiStream from "../aiStream.js";
import type * as analytics from "../analytics.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as barbershopCascade from "../barbershopCascade.js";
import type * as barbershopMemberServices from "../barbershopMemberServices.js";
import type * as barbershopMembers from "../barbershopMembers.js";
import type * as barbershopMetadata from "../barbershopMetadata.js";
import type * as barbershops from "../barbershops.js";
import type * as cascade from "../cascade.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as dashboardAnalytics from "../dashboardAnalytics.js";
import type * as emails from "../emails.js";
import type * as errors from "../errors.js";
import type * as geospatial from "../geospatial.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as inAppNotifications from "../inAppNotifications.js";
import type * as index from "../index.js";
import type * as inventory from "../inventory.js";
import type * as inventoryAlerts from "../inventoryAlerts.js";
import type * as invitations from "../invitations.js";
import type * as invitationsSchema from "../invitationsSchema.js";
import type * as log from "../log.js";
import type * as migrations from "../migrations.js";
import type * as notificationCopy from "../notificationCopy.js";
import type * as notificationSubjects from "../notificationSubjects.js";
import type * as notifications from "../notifications.js";
import type * as plans from "../plans.js";
import type * as polar from "../polar.js";
import type * as posthog from "../posthog.js";
import type * as r2 from "../r2.js";
import type * as ratelimit from "../ratelimit.js";
import type * as reviewModeration from "../reviewModeration.js";
import type * as reviews from "../reviews.js";
import type * as services from "../services.js";
import type * as tracing from "../tracing.js";
import type * as twilio from "../twilio.js";
import type * as userProfileData from "../userProfileData.js";
import type * as utils from "../utils.js";
import type * as whatsapp from "../whatsapp.js";
import type * as whatsappNotificationCore from "../whatsappNotificationCore.js";
import type * as workosOrgs from "../workosOrgs.js";

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
  aiRag: typeof aiRag;
  aiStream: typeof aiStream;
  analytics: typeof analytics;
  appointments: typeof appointments;
  auth: typeof auth;
  authz: typeof authz;
  barbershopCascade: typeof barbershopCascade;
  barbershopMemberServices: typeof barbershopMemberServices;
  barbershopMembers: typeof barbershopMembers;
  barbershopMetadata: typeof barbershopMetadata;
  barbershops: typeof barbershops;
  cascade: typeof cascade;
  credits: typeof credits;
  crons: typeof crons;
  dashboardAnalytics: typeof dashboardAnalytics;
  emails: typeof emails;
  errors: typeof errors;
  geospatial: typeof geospatial;
  http: typeof http;
  identity: typeof identity;
  inAppNotifications: typeof inAppNotifications;
  index: typeof index;
  inventory: typeof inventory;
  inventoryAlerts: typeof inventoryAlerts;
  invitations: typeof invitations;
  invitationsSchema: typeof invitationsSchema;
  log: typeof log;
  migrations: typeof migrations;
  notificationCopy: typeof notificationCopy;
  notificationSubjects: typeof notificationSubjects;
  notifications: typeof notifications;
  plans: typeof plans;
  polar: typeof polar;
  posthog: typeof posthog;
  r2: typeof r2;
  ratelimit: typeof ratelimit;
  reviewModeration: typeof reviewModeration;
  reviews: typeof reviews;
  services: typeof services;
  tracing: typeof tracing;
  twilio: typeof twilio;
  userProfileData: typeof userProfileData;
  utils: typeof utils;
  whatsapp: typeof whatsapp;
  whatsappNotificationCore: typeof whatsappNotificationCore;
  workosOrgs: typeof workosOrgs;
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
  workOSAuthKit: import("@convex-dev/workos-authkit/_generated/component.js").ComponentApi<"workOSAuthKit">;
  authz: import("@djpanda/convex-authz/_generated/component.js").ComponentApi<"authz">;
  auditLog: import("convex-audit-log/_generated/component.js").ComponentApi<"auditLog">;
  twilio: import("@convex-dev/twilio/_generated/component.js").ComponentApi<"twilio">;
  whatsapp: import("convex-whatsapp/_generated/component.js").ComponentApi<"whatsapp">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
  posthog: import("@posthog/convex/_generated/component.js").ComponentApi<"posthog">;
  unreadTracking: import("convex-unread-tracking/_generated/component.js").ComponentApi<"unreadTracking">;
  convexCascadingDelete: import("@00akshatsinha00/convex-cascading-delete/_generated/component.js").ComponentApi<"convexCascadingDelete">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  geospatial: import("@convex-dev/geospatial/_generated/component.js").ComponentApi<"geospatial">;
  aggregateCompletedAppointments: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateCompletedAppointments">;
  aggregateWhatsappMessagesSent: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateWhatsappMessagesSent">;
  aggregateSmsSent: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateSmsSent">;
  aggregateEmailsSent: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateEmailsSent">;
  aggregateReviewRatings: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateReviewRatings">;
  aggregateInventoryValue: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateInventoryValue">;
  aggregateInventoryMovements: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateInventoryMovements">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  reviewModerationWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"reviewModerationWorkpool">;
};
