import { GeospatialIndex } from "@convex-dev/geospatial";
import { cronJobs } from "convex/server";
import { components, internal } from "./_generated/api";

export const geospatial = new GeospatialIndex(components.geospatial);

export { checkIsBarber, getCurrentUser } from "./auth";

// Define cron jobs for reminders and grace no-show handling
const crons = cronJobs();

crons.interval(
  "send 30-min appointment reminders",
  { minutes: 5 },
  internal.reminders.runReminderScan,
  {},
);

crons.interval(
  "mark no-shows after grace period",
  { minutes: 5 },
  internal.reminders.runGraceNoShowScan,
  {},
);

export default crons;
