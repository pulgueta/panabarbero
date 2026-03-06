import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import type { FC, ReactElement } from "react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { barbershopFormSchema } from "@/lib/schemas";
import { CreateBarbershopForm } from "./create-barbershop-form";

interface CreateBarbershopDialogProps {
  trigger: ReactElement;
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

    try {
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
        });
      }
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }
  });

  const title = "Crea tu barbería";
  const description = "Ingresa los datos generales tu barbería.";

  return (
    <ResponsiveModal>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <CreateBarbershopForm
          formIds={formIds}
          // @ts-expect-error - zod's coerce method returns an unknown type
          form={form}
          onSubmit={onSubmit}
        />

        <ResponsiveModalFooter>
          <Field>
            <Button
              type="submit"
              form={formIds.form}
              disabled={isCreatingBarbershop}
            >
              {isCreatingBarbershop && <Spinner />} Crear barbería
            </Button>
          </Field>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
