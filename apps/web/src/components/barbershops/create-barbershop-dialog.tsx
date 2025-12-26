import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import { useId } from "react";
import { useForm } from "react-hook-form";

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
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";
import { barbershopFormSchema } from "@/lib/schemas";
import { CreateBarbershopForm } from "./create-barbershop-form";

interface CreateBarbershopDialogProps {
  trigger: ReactNode;
  userId: string | undefined;
}

export const CreateBarbershopDialog: FC<CreateBarbershopDialogProps> = ({
  trigger,
  userId,
}) => {
  const formIds = {
    form: useId(),
    name: useId(),
    gracePeriodMinutes: useId(),
    description: useId(),
    address: useId(),
    addressDetails: useId(),
    state: useId(),
    city: useId(),
    zipCode: useId(),
    contactPhone: useId(),
    ownerIsBarber: useId(),
    ownerBarber: useId(),
    ownerOnly: useId(),
  };

  const navigate = useNavigate();

  const form = useForm({
    // @ts-expect-error - zod's coerce method returns an unknown type
    resolver: zodResolver(barbershopFormSchema),
    defaultValues: {
      address: {
        fullAddress: "",
        details: undefined,
      },
      city: "",
      state: "",
      zipCode: "",
      contactPhone: "",
      isActive: false,
      gracePeriodMinutes: 5,
      availability: [
        {
          weekDay: {
            day: "monday",
            isActive: true,
          },
          openAt: "09:00",
          closeAt: "18:00",
        },
      ],
      ownerIsBarber: true,
    },
  });

  const {
    createBarbershopMutation: {
      mutateAsync: createBarbershop,
      isPending: isCreatingBarbershop,
    },
  } = useBarbershopActions();

  const onSubmit = form.handleSubmit(async (data) => {
    if (!userId) return;

    const uuid = crypto.randomUUID();
    const { ownerIsBarber, ...barbershopData } = data;

    const barbershopId = await createBarbershop({
      barbershop: {
        ...barbershopData,
        ownerId: userId,
        uuid,
      },
      ownerIsBarber,
    });

    if (barbershopId) {
      navigate({
        to: "/profile/barbershops/settings",
        search: (prev) => ({ ...prev, barbershopId }),
      });
    }
  });

  const title = "Crea tu barbería";
  const description = "Ingresa los datos generales tu barbería.";

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <CreateBarbershopForm
          formIds={formIds}
          // @ts-expect-error - zod's coerce method returns an unknown type
          form={form}
          onSubmit={onSubmit}
        />

        <DialogFooter>
          <Field>
            <Button
              type="submit"
              form={formIds.form}
              disabled={isCreatingBarbershop}
            >
              {isCreatingBarbershop && <Spinner />} Crear barbería
            </Button>
          </Field>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
