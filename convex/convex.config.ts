import agent from "@convex-dev/agent/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import geospatial from "@convex-dev/geospatial/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import polar from "@convex-dev/polar/convex.config";
import r2 from "@convex-dev/r2/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import twilio from "@convex-dev/twilio/convex.config";
import authkit from "@convex-dev/workos-authkit/convex.config";
import posthog from "@posthog/convex/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";
import inviteLinks from "convex-invite-links/convex.config";
import unreads from "convex-unread-tracking/convex.config";

const app = defineApp({
  env: {
    POSTHOG_PROJECT_TOKEN: v.string(),
    POSTHOG_HOST: v.optional(v.string()),
    POSTHOG_PERSONAL_API_KEY: v.optional(v.string()),
    POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS: v.optional(v.string()),
  },
});
app.use(authkit);
app.use(twilio);
app.use(rateLimiter);
app.use(r2);
app.use(migrations);
app.use(polar);
app.use(posthog, {
  env: {
    POSTHOG_PROJECT_TOKEN: app.env.POSTHOG_PROJECT_TOKEN,
    POSTHOG_HOST: app.env.POSTHOG_HOST,
    POSTHOG_PERSONAL_API_KEY: app.env.POSTHOG_PERSONAL_API_KEY,
    POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS:
      app.env.POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS,
  },
});
app.use(unreads);
app.use(agent);
app.use(geospatial);
app.use(inviteLinks);
app.use(aggregate, { name: "aggregateCompletedAppointments" });
app.use(aggregate, { name: "aggregateSmsSent" });
app.use(aggregate, { name: "aggregateEmailsSent" });
export default app;
