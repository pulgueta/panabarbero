/** biome-ignore-all lint/style/noNonNullAssertion: can be null */
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@panabarbero/convex/schemas";
import { Link, useNavigate } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import { Activity, useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import { useIsBarber } from "@/hooks/use-barbershop-members";
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
  trigger: ReactNode;
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

  const navigate = useNavigate();

  const { data: user } = useSession();
  const { data: userProfile } = useProfile(user?.userId!);
  const { data: isBarber } = useIsBarber(user?.userId!);
  const {
    createAppointment: {
      mutateAsync: createAppointment,
      isSuccess: isCreatedAppointment,
      isPending: isCreatingAppointment,
    },
  } = useAppointmentActions();
  const { minutesOfTimestamp, scheduleForDate, timeStringToMinutes } =
    useAppointmentFormMetadata(barbershopId);

  const { service } = useServicesStore();
  const userId =
    userProfile?.userId === user?.userId && isBarber
      ? userProfile?.userId!
      : user?.userId!;

  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: undefined,
      customerName: isBarber ? undefined : userProfile?.name,
      contactPhone: isBarber ? undefined : userProfile?.phoneNumber,
      contactEmail: isBarber ? undefined : userProfile?.email,
      notes: "",
      barbershopMemberId:
        barbers.length && barbers.length > 1 ? undefined : barbers[0]._id,
    },
  });

  useEffect(() => {
    if (isCreatedAppointment) {
      toast.success("Cita reservada exitosamente");
    }
  }, [isCreatedAppointment]);

  const headLabel = "Reservar cita";
  const description = isBarber
    ? "Proporciona los datos del cliente para reservar el servicio."
    : "Debes iniciar sesión para poder reservar un servicio";

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
      (openMinutes !== null && selectedMinutes < openMinutes) ||
      (closeMinutes !== null && selectedMinutes >= closeMinutes)
    ) {
      toast.error("Selecciona una hora dentro del horario de atención.");
      return;
    }

    const lunchStartMinutes = timeStringToMinutes(schedule.lunchStart);
    const lunchEndMinutes = timeStringToMinutes(schedule.lunchEnd);

    if (
      lunchStartMinutes !== null &&
      lunchEndMinutes !== null &&
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
          userId,
          barbershopId,
          barbershopMemberId: formData.barbershopMemberId,
          serviceId: serviceId ?? service._id,
          isBarber,
        },
      });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }

    form.reset();

    if (isBarber) {
      setOpen(false);
    } else {
      throw navigate({
        to: "/profile",
        search: (prev) => ({ ...prev, tab: "appointments" }),
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Activity mode={user ? "visible" : "hidden"}>
          <CreateAppointmentForm
            barbershopId={barbershopId}
            barbers={barbers}
            isBarber={isBarber}
            services={services}
            // @ts-expect-error - zod's coerce method returns an unknown type
            form={form}
            disabledFields={
              isBarber ? [] : ["contactEmail", "contactPhone", "customerName"]
            }
            formIds={formIds}
            onSubmit={onSubmit}
          />
        </Activity>

        <DialogFooter>
          {user ? (
            <Field>
              <Button
                type="submit"
                form={formIds.form}
                disabled={isCreatingAppointment}
              >
                {isCreatingAppointment && <Spinner />}
                Reservar
              </Button>
            </Field>
          ) : (
            <Button asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
