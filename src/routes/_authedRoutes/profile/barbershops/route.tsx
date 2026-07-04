import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  barbershopByMemberUserIdQueryOptions,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import { getBarbershopPlanQueryOptions } from "@/hooks/billing/use-plan";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authedRoutes/profile/barbershops")({
  component: DashboardLayout,
  ssr: "data-only",
  staticData: { breadcrumb: "Panel" },
  loader: async ({ context }) => {
    const userId = context.userId;

    if (!userId) {
      return;
    }

    // The shell (sidebar identity, role-filtered nav) reads these on first
    // paint; children ensure the same keys, so this adds no extra blocking.
    const [barbershop, roles] = await Promise.all([
      context.queryClient.ensureQueryData(
        barbershopByMemberUserIdQueryOptions(userId),
      ),
      context.queryClient.ensureQueryData(
        barbershopMemberRolesQueryOptions(userId),
      ),
    ]);

    // The dashboard is for members only. A customer (no membership) has no
    // barbershop and no roles — send them to their profile rather than
    // letting the role default silently to "barber".
    if (!barbershop && !roles?.roles?.length) {
      throw redirect({ to: "/profile", search: { tab: "account" } });
    }

    if (barbershop?._id) {
      void context.queryClient.prefetchQuery(
        getBarbershopPlanQueryOptions(barbershop._id),
      );
    }
  },
});

function DashboardLayout() {
  const { data: user } = useSession();
  const userId = user?.id ?? "";

  const { data: barbershop } = useBarbershopByMemberUserId(userId);
  const { data: rolesData } = useBarbershopMemberRoles(userId);

  const role = rolesData?.isOwner
    ? "owner"
    : rolesData?.isStaff
      ? "staff"
      : "barber";

  return (
    <SidebarProvider>
      <DashboardSidebar barbershop={barbershop} role={role} user={user} />
      <SidebarInset>
        <DashboardTopbar />
        <div
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6"
          style={{ viewTransitionName: "dashboard-content" }}
        >
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
