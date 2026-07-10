import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { DASHBOARD_GUTTER_X } from "@/components/dashboard/dashboard-gutter";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authedRoutes/profile/barbershops")({
  component: DashboardLayout,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Panel" },
  beforeLoad: async ({ context }) => {
    const userId = context.userId;

    if (!userId) {
      return {
        dashboardBarbershop: null,
        dashboardRoles: null,
      };
    }

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

    return {
      dashboardBarbershop: barbershop,
      dashboardRoles: roles,
    };
  },
  loader: async ({ context }) => {
    if (context.dashboardBarbershop?._id) {
      void context.queryClient.prefetchQuery(
        getBarbershopPlanQueryOptions(context.dashboardBarbershop._id),
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
          className={cn("w-full flex-1 py-6", DASHBOARD_GUTTER_X)}
          style={{ viewTransitionName: "dashboard-content" }}
        >
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
