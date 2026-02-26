/** biome-ignore-all lint/style/noNonNullAssertion: Needed */

import type { BarbershopMemberWithName, Service } from "@convex/tables";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Check, UserPlus, X } from "lucide-react";
import type { FC } from "react";
import { Activity, Suspense, useId, useState } from "react";
import { toast } from "sonner";

import { InviteBarberDialog } from "@/components/barbers/invite-barber-dialog";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  barbershopByMemberUserIdQueryOptions,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import {
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  useBarbershopMemberActions,
  useBarbershopMembersByBarbershopId,
  useServicesForBarber,
} from "@/hooks/use-barbershop-members";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/barbers/",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByMemberUserIdQueryOptions(user.userId),
      );

      const barbershopMemberRoles =
        await opts.context.queryClient.ensureQueryData(
          barbershopMemberRolesQueryOptions(user.userId),
        );

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      await opts.context.queryClient.ensureQueryData(
        barbershopMemberRolesQueryOptions(user.userId),
      );

      if (barbershop?._id) {
        const barbershopMembers =
          await opts.context.queryClient.ensureQueryData(
            barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
          );
        await opts.context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        );

        if (barbershopMembers.length) {
          await Promise.all(
            barbershopMembers.map((barbershopMember) =>
              opts.context.queryClient.ensureQueryData(
                servicesForBarberQueryOptions(barbershopMember._id),
              ),
            ),
          );
        }
      }
    }
  },
});

function RouteComponent() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.userId!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId!);
  const { data: barbershopMembers, isLoading: isLoadingBarbershopMembers } =
    useBarbershopMembersByBarbershopId(barbershop?._id!);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);

  return (
    <BorderContainer className="space-y-4">
      <section className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="space-y-1">
            <h1 className="font-bold text-2xl tracking-tight">
              Gestiona tus barberos
            </h1>
            <p className="text-muted-foreground text-sm">
              Asigna servicios a cada barbero de tu equipo.
            </p>
          </div>

          {rolesData?.isOwner && (
            <InviteBarberDialog
              barbershopId={barbershop?._id!}
              trigger={
                <Button variant="outline" disabled={!rolesData?.isOwner}>
                  <UserPlus className="size-3" />
                  Invitar barbero
                </Button>
              }
            />
          )}
        </div>

        <Activity
          mode={
            !isLoadingBarbershopMembers && barbershopMembers?.length
              ? "visible"
              : "hidden"
          }
        >
          <Suspense fallback={<ProfileTabSkeleton />}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services &&
                barbershopMembers.map((barbershopMember) => (
                  <BarberCard
                    key={barbershopMember._id}
                    barbershopMember={barbershopMember}
                    services={services}
                    isOwner={rolesData?.isOwner!}
                  />
                ))}
            </div>
          </Suspense>
        </Activity>

        {barbershopMembers?.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No hay barberos registrados.</EmptyTitle>
              <EmptyDescription>
                Cuando agregues barberos a tu equipo, podrás verlos aquí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </BorderContainer>
  );
}

interface BarberCardProps {
  barbershopMember: BarbershopMemberWithName;
  services: Service[];
  isOwner: boolean;
}

const BarberCard: FC<BarberCardProps> = ({
  barbershopMember,
  services,
  isOwner,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState<boolean>(false);

  const { data: barberServices, isLoading: isLoadingBarberServices } =
    useServicesForBarber(barbershopMember._id);
  const {
    removeBarberMutation: {
      mutateAsync: removeBarber,
      isPending: isRemovingBarber,
    },
  } = useBarbershopMemberActions();

  const canRemoveBarber =
    isOwner &&
    barbershopMember.roles.includes("barber") &&
    !barbershopMember.roles.includes("owner");

  const handleRemoveBarber = async () => {
    try {
      await removeBarber({ barbershopMemberId: barbershopMember._id });
      toast.success(`${barbershopMember.name} fue eliminado de la barbería`);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    } finally {
      setRemoveDialogOpen(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{barbershopMember.name}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap gap-1">
              {barbershopMember.roles.map((role) => (
                <Badge
                  key={role}
                  variant={role === "owner" ? "default" : "secondary"}
                >
                  {role === "owner" ? "Dueño" : "Barbero"}
                </Badge>
              ))}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-sm">
            Servicios asignados:
          </p>
          {isLoadingBarberServices ? (
            <Spinner className="size-4" />
          ) : barberServices && barberServices.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {barberServices.slice(0, 3).map((service) => (
                <Badge key={service?._id} variant="outline">
                  {service?.name}
                </Badge>
              ))}
              {barberServices.length > 3 && (
                <Badge variant="outline">
                  +{barberServices.length - 3} más
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs italic">
              Sin servicios asignados
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        {isOwner && (
          <ManageServicesDialog
            barbershopMember={barbershopMember}
            services={services}
            currentServices={barberServices!}
            open={open}
            onOpenChange={setOpen}
            onSuccess={() => {
              toast.success("Servicios actualizados correctamente");
            }}
          />
        )}

        {canRemoveBarber && (
          <>
            <Button
              variant="destructive"
              onClick={() => setRemoveDialogOpen(true)}
              disabled={isRemovingBarber}
            >
              {isRemovingBarber && <Spinner />}
              Eliminar
            </Button>
            <AlertDialog
              open={removeDialogOpen}
              onOpenChange={setRemoveDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Eliminar a {barbershopMember.name}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción removerá a este barbero de tu barbería y perderá
                    el acceso a los servicios asignados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    render={
                      <Button
                        variant="destructive"
                        onClick={handleRemoveBarber}
                        disabled={isRemovingBarber}
                      />
                    }
                  >
                    {isRemovingBarber && <Spinner />}
                    Eliminar barbero
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

interface ManageServicesDialogProps {
  barbershopMember: BarberCardProps["barbershopMember"];
  services: Service[];
  currentServices: Service[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function ManageServicesDialog({
  barbershopMember,
  services,
  currentServices,
  open,
  onOpenChange,
}: ManageServicesDialogProps) {
  const dialogId = useId();
  const [selectedServices, setSelectedServices] = useState<Set<Service["_id"]>>(
    () => new Set(currentServices?.map((s) => s._id)),
  );

  const {
    setBarberServicesMutation: {
      mutateAsync: setBarberServices,
      isPending: isSettingBarberServices,
    },
  } = useBarbershopMemberActions();

  const handleToggleService = (serviceId: Service["_id"]) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedServices(new Set(services.map((s) => s._id)));
  };

  const handleClearAll = () => {
    setSelectedServices(new Set());
  };

  const handleSave = async () => {
    try {
      await setBarberServices({
        barbershopMemberId: barbershopMember._id,
        serviceIds: Array.from(selectedServices),
      });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    }
  };

  // Reset selected services when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedServices(new Set(currentServices?.map((s) => s._id)));
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="outline">Gestionar servicios</Button>}
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Servicios de {barbershopMember.name}</DialogTitle>
          <DialogDescription>
            Selecciona los servicios que este barbero puede ofrecer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={handleSelectAll}>
              <Check className="size-3" />
              Todos
            </Button>
            <Button variant="outline" onClick={handleClearAll}>
              <X className="size-3" />
              Ninguno
            </Button>
          </div>

          <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2">
            {services.map((service) => {
              const checkboxId = `${dialogId}-service-${service._id}`;
              return (
                <div
                  key={service._id}
                  className="flex items-center space-x-3 rounded-md border p-3"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={selectedServices.has(service._id)}
                    onCheckedChange={() => handleToggleService(service._id)}
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="flex-1 cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {service.name}
                  </Label>
                </div>
              );
            })}
          </div>

          {services.length === 0 && (
            <p className="text-center text-muted-foreground text-sm">
              No hay servicios creados para esta barbería.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSettingBarberServices}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSettingBarberServices || services.length === 0}
          >
            {isSettingBarberServices && <Spinner />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
