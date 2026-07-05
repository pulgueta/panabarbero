/** biome-ignore-all lint/style/noNonNullAssertion: route loader gates and primes the item data */

import type { InventoryItem } from "@convex/schema";
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
import {
  inventoryOverviewQueryOptions,
  useInventoryOverview,
} from "@/hooks/use-inventory";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/$itemId/edit/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Editar producto" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context, params }) => {
    const barbershop = context.dashboardBarbershop;
    const roles = context.dashboardRoles;
    const itemId = params.itemId as InventoryItem["_id"];

    if (!barbershop?._id || (!roles?.isOwner && !roles?.isStaff)) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }

    // Plan gate first: getInventoryOverview throws for inventory-disabled
    // plans, so it must not be fetched before the redirect check.
    const plan = await context.queryClient.ensureQueryData(
      getBarbershopPlanQueryOptions(barbershop._id),
    );

    if (!plan?.planLimits.inventoryEnabled) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }

    const overview = await context.queryClient.ensureQueryData(
      inventoryOverviewQueryOptions(barbershop._id),
    );

    const item = overview.rows.find((row) => row._id === itemId);

    if (!item) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }
  },
});

function RouteComponent() {
  const { itemId } = Route.useParams();
  const typedItemId = itemId as InventoryItem["_id"];
  const { data: user } = useSession();
  const userId = user?.id ?? "";
  const { data: barbershop } = useBarbershopByMemberUserId(userId);
  const { data: overview } = useInventoryOverview(barbershop?._id!);
  const item = overview.rows.find((row) => row._id === typedItemId);

  if (!barbershop?._id || !item) {
    return null;
  }

  return <EditItemPage barbershopId={barbershop._id} item={item} />;
}

const EditItemPage: FC<{
  barbershopId: NonNullable<
    ReturnType<typeof useBarbershopByMemberUserId>["data"]
  >["_id"];
  item: ReturnType<typeof useInventoryOverview>["data"]["rows"][number];
}> = ({ barbershopId, item }) => {
  const navigate = Route.useNavigate();

  const engine = useItemForm({
    barbershopId,
    itemId: item._id,
    currentImageKey: item.imageKey,
    initialValues: {
      barbershopId,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      isSellable: item.isSellable,
      unitCost: item.unitCost ?? 0,
      salePrice: item.salePrice,
      reorderPoint: item.reorderPoint,
      reorderQuantity: item.reorderQuantity,
      allowNegativeStock: item.allowNegativeStock ?? false,
    },
    onSuccess: () => {
      void navigate({ to: "/profile/barbershops/inventory" });
    },
  });
  const { form, photoFile } = engine;

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Editar producto"
          description="Actualiza la ficha operativa y la imagen del producto."
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
              <ItemFormFields engine={engine} itemId={item._id} />

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
                    label="Guardar cambios"
                    forceEnabled={photoFile !== null}
                  />
                </form.AppForm>
              </FormPageFooter>
            </form>
          </FormPageFields>

          <FormPagePreview>
            <ItemPreviewCard engine={engine} showInitialQuantity={false} />
          </FormPagePreview>
        </FormPageBody>
      </DashboardPageContent>
    </DashboardPage>
  );
};
