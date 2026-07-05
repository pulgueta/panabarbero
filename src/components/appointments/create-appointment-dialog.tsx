/** biome-ignore-all lint/style/noNonNullAssertion: can be null */

import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { Link, useNavigate } from "@tanstack/react-router";
import type { FC, ReactElement } from "react";
import { Activity, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import {
  useBarberByUserId,
  useBarbersForService,
  useIsBarber,
  useIsStaff,
  useServicesForBarber,
} from "@/hooks/use-barbershop-members";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import { useServicesStore } from "@/store/services";
import { CreateAppointmentForm } from "./create-appointment-form";

interface CreateAppointmentDialogProps {
  services: Service[];
  serviceId?: Service["_id"];
  barbers: BarbershopMemberWithName[];
  barbershopId: Barbershop["_id"];
  trigger: ReactElement;
  /** Controlled open state — omit to let the trigger manage it internally. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pre-selects the appointment day (ms) when opened from a calendar slot. */
  initialDate?: number;
}

export const CreateAppointmentDialog: FC<CreateAppointmentDialogProps> = ({
  services,
  serviceId,
  barbers,
  barbershopId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialDate,
}) => {
  const formIds = {
    customerName: useId(),
    date: useId(),
    startTime: useId(),
    contactPhone: useId(),
    contactEmail: useId(),
    notes: useId(),
    form: useId(),
    barbershopMemberId: useId(),
    serviceId: useId(),
  };
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [selectedBarber, setSelectedBarber] = useState<
    BarbershopMemberWithName | undefined
  >(undefined);

  const navigate = useNavigate();

  const { data: user } = useSession();
  const { data: userProfile } = useProfile(user?.id ?? "");
  const { data: isBarber } = useIsBarber(user?.id ?? "");
  const { data: isStaff } = useIsStaff(user?.id ?? "");
  const { data: currentBarberMember } = useBarberByUserId(user?.id ?? "");
  const { data: barberServices } = useServicesForBarber(selectedBarber?._id!);
  // service must come before useBarbersForService so we can use the store selection
  const service = useServicesStore();
  // Prefer the service selected in the dropdown over the prop (pre-selected from outside).
  const effectiveServiceId = (service._id || serviceId) as
    | Service["_id"]
    | undefined;
  const { data: barbersForService } = useBarbersForService(effectiveServiceId!);

  // Staff and barbers create appointments on behalf of clients
  const isCreatingOnBehalf = isBarber || isStaff;
  const showPhoneField =
    isCreatingOnBehalf || (!isCreatingOnBehalf && !userProfile?.phoneNumber);

  const allBarbers = barbers?.filter((b) => b?.roles?.includes("barber"));

  // Barbers available depends on context:
  // - No service selected: show all barbers
  // - Service selected (prop or dropdown): filter to only barbers who offer it
  //   If only 1 barber → form auto-shows disabled input
  //   If 0 barbers → form shows "no barbers available"
  const availableBarbers = effectiveServiceId
    ? (barbersForService ?? allBarbers)
    : allBarbers;

  // When a barber creates an appointment, default to themselves
  // Barbers default to themselves; staff must pick a barber
  const defaultBarberId =
    isBarber && !isStaff
      ? currentBarberMember?._id
      : availableBarbers?.length === 1
        ? availableBarbers[0]?._id
        : undefined;

  // When a barber is creating, auto-select themselves (staff must pick)
  useEffect(() => {
    if (isBarber && !isStaff && currentBarberMember) {
      const self = barbers.find((b) => b._id === currentBarberMember._id);
      if (self) {
        setSelectedBarber(self);
      }
    }
  }, [isBarber, isStaff, currentBarberMember, barbers]);

  // Mirror the form's narrowing auto-select so barberServices stays in sync.
  // Applies to customers always, and to staff when a service filters the list.
  useEffect(() => {
    if (availableBarbers?.length === 1 && (!isCreatingOnBehalf || isStaff)) {
      setSelectedBarber(availableBarbers[0]!);
    }
  }, [isCreatingOnBehalf, isStaff, availableBarbers]);

  const headLabel = "Reservar cita";
  const description = isCreatingOnBehalf
    ? "Proporciona los datos del cliente para reservar el servicio."
    : "Ingresa los datos para reservar el servicio.";

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent className="overflow-y-auto">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{headLabel}</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {user
              ? description
              : "Debes iniciar sesión para poder reservar un servicio"}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <Activity mode={user ? "visible" : "hidden"}>
          <CreateAppointmentForm
            barbershopId={barbershopId}
            barbers={
              availableBarbers?.filter((barber) => barber !== null) ?? barbers
            }
            isBarber={isCreatingOnBehalf ?? false}
            hideBarberSelector={isBarber && !isStaff}
            services={services}
            barberServices={barberServices?.filter(
              (service) => service !== null,
            )}
            onBarberChange={setSelectedBarber}
            effectiveServiceId={effectiveServiceId}
            showPhoneField={showPhoneField}
            disabledFields={
              isCreatingOnBehalf
                ? []
                : userProfile?.phoneNumber
                  ? ["contactEmail", "customerName", "contactPhone"]
                  : ["contactEmail", "customerName"]
            }
            formIds={formIds}
            initialValues={{
              customerName: isCreatingOnBehalf
                ? undefined
                : (userProfile?.name ?? undefined),
              contactPhone: isCreatingOnBehalf
                ? undefined
                : (userProfile?.phoneNumber ?? undefined),
              contactEmail: isCreatingOnBehalf
                ? undefined
                : (userProfile?.email ?? undefined),
              barbershopMemberId: defaultBarberId ?? selectedBarber?._id,
              date: initialDate,
            }}
            onSuccess={() => {
              setOpen(false);

              if (!isCreatingOnBehalf) {
                navigate({
                  to: "/profile",
                  search: (prev) => ({ ...prev, tab: "appointments" }),
                });
              }
            }}
          />
        </Activity>

        {!user && (
          <ResponsiveModalFooter>
            <Button nativeButton={false} render={<Link to="/login" />}>
              Iniciar sesión
            </Button>
          </ResponsiveModalFooter>
        )}
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
