import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/team/",
)({
  beforeLoad: async (opts) => {
    const barbershopMemberRoles = opts.context.dashboardRoles;

    if (!barbershopMemberRoles?.isOwner && !barbershopMemberRoles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    throw redirect({
      to: "/profile/barbershops/team/barbers",
      replace: true,
    });
  },
});
