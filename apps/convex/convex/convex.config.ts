// import betterAuth from "@convex-dev/better-auth/convex.config";
import postgis from "@convex-dev/geospatial/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
// app.use(betterAuth);
app.use(postgis);

export default app;
