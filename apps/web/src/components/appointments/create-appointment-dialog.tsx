/** biome-ignore-all lint/style/noNonNullAssertion: can be null */
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  BarbershopMemberWithName,
  Service,
} from "@panabarbero/convex/schemas";
import { Link, useNavigate } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import { Activity, useEffect, useId } from "react";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { appointmentFormSchema } from "@/lib/schemas";
import { CreateAppointmentForm } from "./create-appointment-form";

interface CreateAppointmentDialogProps {
  service: Service;
  services: Service[];
  barbers: BarbershopMemberWithName[];
  trigger: ReactNode;
}

export const CreateAppointmentDialog: FC<CreateAppointmentDialogProps> = ({
  service,
  services,
  barbers,
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

  const navigate = useNavigate();

  const { isMobile } = useIsMobile();
  const { data: user } = useSession();
  const { data: userProfile } = useProfile(user?.userId!);
  const {
    createAppointment: {
      mutateAsync: createAppointment,
      isSuccess: isCreatedAppointment,
      isPending: isCreatingAppointment,
    },
  } = useAppointmentActions();
  const { minutesOfTimestamp, scheduleForDate, timeStringToMinutes } =
    useAppointmentFormMetadata(service.barbershopId);

  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: undefined,
      customerName: userProfile?.name,
      contactPhone: userProfile?.phoneNumber,
      contactEmail: userProfile?.email,
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

  const headLabel = `Reservar: ${service.name}`;
  const description = user
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
          userId: user?.userId!,
          barbershopId: service.barbershopId,
          serviceId: service._id,
          barbershopMemberId: formData.barbershopMemberId,
        },
      });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }

    form.reset();
    throw navigate({
      to: "/profile",
      search: (prev) => ({ ...prev, tab: "appointments" }),
    });
  });

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          <Activity mode={user ? "visible" : "hidden"}>
            <div className="p-4">
              <CreateAppointmentForm
                barbers={barbers}
                service={service}
                services={services}
                // @ts-expect-error - zod's coerce method returns an unknown type
                form={form}
                initialValues={{
                  customerName: user?.name,
                  contactEmail: user?.email,
                  contactPhone: user?.phoneNumber!,
                }}
                formIds={formIds}
                onSubmit={onSubmit}
              />
            </div>
          </Activity>

          <DrawerFooter>
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
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Activity mode={user ? "visible" : "hidden"}>
          <CreateAppointmentForm
            barbers={barbers}
            service={service}
            services={services}
            // @ts-expect-error - zod's coerce method returns an unknown type
            form={form}
            initialValues={{
              customerName: user?.name,
              contactEmail: user?.email,
              contactPhone: user?.phoneNumber!,
            }}
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
