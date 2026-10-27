import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSignUpUrl } from "@workos/authkit-tanstack-react-start";

export const Route = createFileRoute("/_auth/register")({
  loader: async ({ context }) => {
    if (context.userId) {
      throw redirect({ to: "/profile", search: { tab: "account" } });
    }

    throw redirect({ href: await getSignUpUrl() });
  },
});
