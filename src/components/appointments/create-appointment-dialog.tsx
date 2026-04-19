/** biome-ignore-all lint/style/noNonNullAssertion: can be null */

import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import type { FC, ReactElement } from "react";
import { Activity, useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import {
  useBarberByUserId,
  useBarbersForService,
  useIsBarber,
  useIsStaff,
  useServicesForBarber,
} from "@/hooks/use-barbershop-members";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { validateAppointmentTime } from "@/lib/schedule-utils";
import { appointmentFormSchema } from "@/lib/schemas";
import { useServicesStore } from "@/store/services";
import { CreateAppointmentForm } from "./create-appointment-form";

interface CreateAppointmentDialogProps {
  services: Service[];
  serviceId?: Service["_id"];
  barbers: BarbershopMemberWithName[];
  barbershopId: Barbershop["_id"];
  trigger: ReactElement;
}

export const CreateAppointmentDialog: FC<CreateAppointmentDialogProps> = ({
  services,
  serviceId,
  barbers,
  barbershopId,
  trigger,
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
  const [open, setOpen] = useState<boolean>(false);
  const [selectedBarber, setSelectedBarber] = useState<
    BarbershopMemberWithName | undefined
  >(undefined);

  const navigate = useNavigate();

  const { data: user } = useSession();
  const { data: userProfile } = useProfile(user?.userId!);
  const { data: isBarber } = useIsBarber(user?.userId!);
  const { data: isStaff } = useIsStaff(user?.userId!);
  const { data: currentBarberMember } = useBarberByUserId(user?.userId!);
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

  const haptic = useWebHaptics();

  const {
    createAppointment: {
      mutateAsync: createAppointment,
      isPending: isCreatingAppointment,
    },
  } = useAppointmentActions();
  const { scheduleForDate } = useAppointmentFormMetadata(barbershopId);

  // When a barber creates an appointment, default to themselves
  // Barbers default to themselves; staff must pick a barber
  const defaultBarberId =
    isBarber && !isStaff
      ? currentBarberMember?._id
      : availableBarbers?.length === 1
        ? availableBarbers[0]?._id
        : undefined;

  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: undefined,
      customerName: isCreatingOnBehalf ? undefined : userProfile?.name,
      contactPhone: isCreatingOnBehalf ? undefined : userProfile?.phoneNumber,
      contactEmail: isCreatingOnBehalf ? undefined : userProfile?.email,
      notes: "",
      barbershopMemberId: defaultBarberId ?? selectedBarber?._id,
    },
  });

  // When a barber is creating, auto-select themselves (staff must pick)
  useEffect(() => {
    if (isBarber && !isStaff && currentBarberMember) {
      const self = barbers.find((b) => b._id === currentBarberMember._id);
      if (self) {
        setSelectedBarber(self);
        form.setValue("barbershopMemberId", self._id);
      }
    }
  }, [isBarber, isStaff, currentBarberMember, barbers, form]);

  // Auto-select when the available barber list narrows to exactly 1.
  // Applies to customers always, and to staff when a service filters the list.
  useEffect(() => {
    if (availableBarbers?.length === 1 && (!isCreatingOnBehalf || isStaff)) {
      setSelectedBarber(availableBarbers[0]!);
      form.setValue("barbershopMemberId", availableBarbers[0]?._id);
    }
  }, [isCreatingOnBehalf, isStaff, availableBarbers, form]);

  const headLabel = "Reservar cita";
  const description = isCreatingOnBehalf
    ? "Proporciona los datos del cliente para reservar el servicio."
    : "Ingresa los datos para reservar el servicio.";

  const onSubmit = form.handleSubmit(async (formData) => {
    const schedule = scheduleForDate(formData.date);
    const validation = validateAppointmentTime(schedule, formData.date);

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      await createAppointment({
        appointment: {
          ...formData,
          contactPhone: formData.contactPhone,
          barbershopId,
          barbershopMemberId: formData.barbershopMemberId,
          serviceId: effectiveServiceId,
          isStaffCreated: isCreatingOnBehalf ?? false,
        },
      });

      setOpen(false);

      form.reset();
      haptic.trigger("success");
      toast.success("Cita reservada exitosamente");

      if (!isCreatingOnBehalf) {
        navigate({
          to: "/profile",
          search: (prev) => ({ ...prev, tab: "appointments" }),
        });
      }
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
      return;
    }
  });

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
            // @ts-expect-error - zod's coerce method returns an unknown type
            form={form}
            showPhoneField={showPhoneField}
            disabledFields={
              isCreatingOnBehalf
                ? []
                : userProfile?.phoneNumber
                  ? ["contactEmail", "customerName", "contactPhone"]
                  : ["contactEmail", "customerName"]
            }
            formIds={formIds}
            onSubmit={onSubmit}
          />
        </Activity>

        <ResponsiveModalFooter>
          {user ? (
            <Field className="w-full">
              <Button
                type="submit"
                form={formIds.form}
                disabled={isCreatingAppointment || !availableBarbers?.length}
                className="w-full"
              >
                {isCreatingAppointment && <Spinner />}
                Reservar
              </Button>
            </Field>
          ) : (
            <Button nativeButton={false} render={<Link to="/login" />}>
              Iniciar sesión
            </Button>
          )}
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
