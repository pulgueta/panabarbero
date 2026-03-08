import type { Barbershop, BarbershopMetadata } from "@convex/schema";
import type { FC } from "react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";

interface ContactFormProps {
  barbershop: Barbershop;
  barbershopMetadata: BarbershopMetadata;
}

export const ContactForm: FC<ContactFormProps> = ({
  barbershop,
  barbershopMetadata,
}) => {
  const ids = {
    phone: useId(),
    email: useId(),
  };
  const [phone, setPhone] = useState(barbershop.contactPhone ?? "");
  const [email, setEmail] = useState(barbershopMetadata.contactEmail ?? "");

  const {
    updateBarbershopMutation: {
      mutateAsync: updateBarbershop,
      isPending: isUpdatingBarbershop,
    },
  } = useBarbershopActions();

  const haptic = useWebHaptics();

  const onSubmit = async () => {
    try {
      await updateBarbershop({
        id: barbershop._id,
        data: {
          uuid: barbershop.uuid,
          name: barbershop.name,
          description: barbershop.description || undefined,
          address: barbershop.address,
          coordinates: barbershop.coordinates
            ? { x: barbershop.coordinates.x, y: barbershop.coordinates.y }
            : undefined,
          services: barbershop.services ?? [],
          contactPhone: phone || undefined,
          isActive: barbershop.isActive,
          gracePeriodMinutes: barbershop.gracePeriodMinutes ?? 5,
          ownerId: barbershop.ownerId,
          availability: barbershop.availability ?? [],
          city: barbershop.city,
          state: barbershop.state,
          zipCode: barbershop.zipCode || undefined,
          bannerUrl: barbershop.bannerUrl || undefined,
        },
      });
      haptic.trigger("success");
      toast.success("Información de contacto actualizada correctamente");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo actualizar el contacto. Intenta de nuevo.");
    }
  };

  const invalidEmail = !!email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  return (
    <div className="space-y-4">
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={ids.phone}>Teléfono de contacto</FieldLabel>
          <Input
            id={ids.phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="3000000000"
          />
        </Field>
        <Field data-invalid={invalidEmail}>
          <FieldLabel htmlFor={ids.email}>Email de contacto</FieldLabel>
          <Input
            id={ids.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@dominio.com"
          />
          {invalidEmail && (
            <FieldError errors={[{ message: "Email inválido" }]} />
          )}
        </Field>
      </FieldGroup>

      <Button
        onClick={onSubmit}
        disabled={isUpdatingBarbershop || invalidEmail}
      >
        {isUpdatingBarbershop ? <Spinner /> : "Guardar"}
      </Button>
    </div>
  );
};
