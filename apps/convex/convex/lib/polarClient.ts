import { Polar } from "@polar-sh/sdk";

/**
 * Creates a Polar SDK client instance with proper configuration
 * based on the environment (production/sandbox)
 */
export const getPolarClient = () =>
  new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server:
      process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
  });
