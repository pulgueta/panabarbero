import betterAuth from "@convex-dev/better-auth/convex.config";
import pushNotifications from "@convex-dev/expo-push-notifications/convex.config";
import postgis from "@convex-dev/geospatial/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import resend from "@convex-dev/resend/convex.config";
import twilio from "@convex-dev/twilio/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);
app.use(postgis);
app.use(resend);
app.use(twilio);
app.use(pushNotifications);
app.use(rateLimiter);
export default app;
