/** biome-ignore-all lint/style/noNonNullAssertion: can be null */

import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/tables";
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
  useBarbersForService,
  useIsBarber,
  useServicesForBarber,
} from "@/hooks/use-barbershop-members";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";
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
  const [selectedBarberId, setSelectedBarberId] = useState<
    BarbershopMemberWithName["_id"] | undefined
  >(undefined);

  const navigate = useNavigate();

  const { data: user } = useSession();
  const { data: userProfile } = useProfile(user?.userId!);
  const { data: isBarber } = useIsBarber(user?.userId!);
  const { data: barberServices } = useServicesForBarber(selectedBarberId!);
  const { data: barbersForService } = useBarbersForService(serviceId!);

  const showPhoneField = isBarber || (!isBarber && !userProfile?.phoneNumber);

  // When customer is booking a specific service, filter barbers to those who offer it
  // When a barber is creating an appointment, use all barbers
  const availableBarbers =
    !isBarber && serviceId && barbersForService?.length
      ? barbersForService
      : barbers;

  const haptic = useWebHaptics();

  const {
    createAppointment: {
      mutateAsync: createAppointment,
      isSuccess: isCreatedAppointment,
      isPending: isCreatingAppointment,
    },
  } = useAppointmentActions();
  const { minutesOfTimestamp, scheduleForDate, timeStringToMinutes } =
    useAppointmentFormMetadata(barbershopId);

  const service = useServicesStore();

  // Determine default barber: use availableBarbers when available
  const defaultBarberId =
    availableBarbers?.length === 1 ? availableBarbers[0]._id : undefined;

  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: undefined,
      customerName: isBarber ? undefined : userProfile?.name,
      contactPhone: isBarber ? undefined : userProfile?.phoneNumber,
      contactEmail: isBarber ? undefined : userProfile?.email,
      notes: "",
      barbershopMemberId: defaultBarberId ?? selectedBarberId,
    },
  });

  // Update form and state when available barbers change
  useEffect(() => {
    if (availableBarbers?.length === 1) {
      setSelectedBarberId(availableBarbers[0]._id);
      form.setValue("barbershopMemberId", availableBarbers[0]._id);
    }
  }, [availableBarbers, form]);

  useEffect(() => {
    if (isCreatedAppointment) {
      haptic.trigger("success");
      toast.success("Cita reservada exitosamente");
    }
  }, [isCreatedAppointment, haptic]);

  const headLabel = "Reservar cita";
  const description = isBarber
    ? "Proporciona los datos del cliente para reservar el servicio."
    : "Ingresa los datos para reservar el servicio.";

  const onSubmit = form.handleSubmit(async (formData) => {
    const schedule = scheduleForDate(formData.date);

    if (!schedule || !schedule.weekDay.isActive) {
      toast.error("La barbería no atiende en el día seleccionado.");
      return;
    }

    const selectedMinutes = minutesOfTimestamp(formData.date);
    const openMinutes = timeStringToMinutes(schedule.openAt);
    const closeMinutes = timeStringToMinutes(schedule.closeAt);

    if (
      (openMinutes && selectedMinutes < openMinutes) ||
      (closeMinutes && selectedMinutes >= closeMinutes)
    ) {
      toast.error("Selecciona una hora dentro del horario de atención.");
      return;
    }

    const lunchStartMinutes = timeStringToMinutes(schedule.lunchStart);
    const lunchEndMinutes = timeStringToMinutes(schedule.lunchEnd);

    if (
      lunchStartMinutes &&
      lunchEndMinutes &&
      selectedMinutes >= lunchStartMinutes &&
      selectedMinutes < lunchEndMinutes
    ) {
      toast.error(
        "No se puede reservar una cita durante el horario seleccionado.",
      );
      return;
    }

    try {
      await createAppointment({
        appointment: {
          ...formData,
          barbershopId,
          barbershopMemberId: formData.barbershopMemberId,
          serviceId: serviceId ?? service._id,
          isBarber: isBarber ?? false,
        },
      });

      setOpen(false);

      form.reset();

      if (!isBarber) {
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
      <ResponsiveModalContent>
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
            barbers={availableBarbers ?? barbers}
            isBarber={isBarber ?? false}
            services={services}
            barberServices={barberServices!}
            onBarberChange={setSelectedBarberId}
            // @ts-expect-error - zod's coerce method returns an unknown type
            form={form}
            showPhoneField={showPhoneField}
            disabledFields={
              isBarber
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
                disabled={isCreatingAppointment}
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
