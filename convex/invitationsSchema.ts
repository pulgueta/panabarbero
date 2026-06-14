import { z } from "zod";

/**
 * Team-invite form args. Kept in this side-effect-free module so the client
 * invite form can import it without pulling in `convex/invitations.ts`, which
 * imports the server-only WorkOS AuthKit instance (`auth.config.ts`) and would
 * throw "Missing environment variables" when evaluated in the browser.
 */
export const inviteBarberSchema = z.object({
  email: z.string(),
  roles: z.array(z.enum(["barber", "staff"])).length(1),
});
