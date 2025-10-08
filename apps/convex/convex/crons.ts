import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send 30-min appointment reminders",
  { seconds: 30 },
  internal.reminders.runReminderScan,
  {},
);

crons.interval(
  "mark no-shows after grace period",
  { seconds: 30 },
  internal.reminders.runGraceNoShowScan,
  {},
);

export default crons;
