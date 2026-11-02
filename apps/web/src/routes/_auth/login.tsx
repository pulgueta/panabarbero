import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSignInUrl } from "@workos/authkit-tanstack-react-start";

export const Route = createFileRoute("/_auth/login")({
  loader: async ({ context }) => {
    if (context.userId) {
      throw redirect({ to: "/profile", search: { tab: "account" } });
    }

    throw redirect({ href: await getSignInUrl() });
  },
});
