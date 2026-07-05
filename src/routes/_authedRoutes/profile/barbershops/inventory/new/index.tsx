import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { FC } from "react";

import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import {
  FormPageBody,
  FormPageFields,
  FormPageFooter,
  FormPagePreview,
} from "@/components/form/form-page";
import { ItemFormFields } from "@/components/inventory/item-form";
import { ItemPreviewCard } from "@/components/inventory/item-preview-card";
import { useItemForm } from "@/components/inventory/use-item-form";
import { Button } from "@/components/ui/button";
import { cacheTime } from "@/config/cache";
import { useBarbershopByMemberUserId } from "@/hooks/barbershop/use-barbershop";
import { getBarbershopPlanQueryOptions } from "@/hooks/billing/use-plan";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/new/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Nuevo producto" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context }) => {
    const barbershop = context.dashboardBarbershop;
    const roles = context.dashboardRoles;

    // Creation is a management action: owners/staff only.
    if (!roles?.isOwner && !roles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }

    if (barbershop?._id) {
      const plan = await context.queryClient.ensureQueryData(
        getBarbershopPlanQueryOptions(barbershop._id),
      );

      // Without the feature the index page renders the upsell — land there.
      if (!plan?.planLimits.inventoryEnabled) {
        throw redirect({ to: "/profile/barbershops/inventory" });
      }
    }
  },
});

function RouteComponent() {
  const { data: user } = useSession();
  const userId = user?.id ?? "";
  const { data: barbershop } = useBarbershopByMemberUserId(userId);

  if (!barbershop?._id) {
    return null;
  }

  return <NewItemPage barbershopId={barbershop._id} />;
}

const NewItemPage: FC<{
  barbershopId: NonNullable<
    ReturnType<typeof useBarbershopByMemberUserId>["data"]
  >["_id"];
}> = ({ barbershopId }) => {
  const navigate = Route.useNavigate();

  const engine = useItemForm({
    barbershopId,
    onSuccess: () => {
      void navigate({ to: "/profile/barbershops/inventory" });
    },
  });
  const { form, photoFile } = engine;

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Nuevo producto"
          description="Crea un producto y, si ya lo tienes en la barbería, registra su stock inicial."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        <FormPageBody>
          <FormPageFields>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <ItemFormFields engine={engine} />

              <FormPageFooter>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/profile/barbershops/inventory" />}
                >
                  Cancelar
                </Button>
                <form.AppForm>
                  <form.SubmitButton
                    label="Crear producto"
                    forceEnabled={photoFile !== null}
                  />
                </form.AppForm>
              </FormPageFooter>
            </form>
          </FormPageFields>

          <FormPagePreview>
            <ItemPreviewCard engine={engine} />
          </FormPagePreview>
        </FormPageBody>
      </DashboardPageContent>
    </DashboardPage>
  );
};
