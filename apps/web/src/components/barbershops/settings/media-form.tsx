import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/use-barbershop";

interface MediaFormProps {
  barbershop: Barbershop;
}

export const MediaForm: FC<MediaFormProps> = ({ barbershop }) => {
  const ids = {
    banner: useId(),
    website: useId(),
  };
  const [bannerUrl, setBannerUrl] = useState(barbershop.bannerUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(
    barbershop.metadata?.websiteUrl ?? "",
  );

  const {
    updateBarbershop: { mutateAsync: updateBarbershop, isPending },
  } = useBarbershopActions();

  const onSubmit = async () => {
    await updateBarbershop({
      barbershopId: barbershop._id,
      barbershop: {
        uuid: barbershop.uuid,
        name: barbershop.name,
        description: barbershop.description || undefined,
        address: barbershop.address,
        coordinates: barbershop.coordinates
          ? { x: barbershop.coordinates.x, y: barbershop.coordinates.y }
          : undefined,
        services: barbershop.services ?? [],
        contactPhone: barbershop.contactPhone || undefined,
        isActive: barbershop.isActive,
        gracePeriodMinutes: barbershop.gracePeriodMinutes ?? 5,
        ownerId: barbershop.ownerId,
        availability: barbershop.availability ?? [],
        city: barbershop.city,
        state: barbershop.state,
        zipCode: barbershop.zipCode || undefined,
        bannerUrl: bannerUrl || undefined,
        metadata: {
          websiteUrl: websiteUrl || undefined,
          contactEmail: barbershop.metadata?.contactEmail || undefined,
          completedAppointments: barbershop.metadata?.completedAppointments,
          reviews: barbershop.metadata?.reviews,
          rating: barbershop.metadata?.rating,
          socialMedia: barbershop.metadata?.socialMedia || undefined,
        },
      },
    });
  };

  const invalidWebsite = !!websiteUrl && !/^https?:\/\//i.test(websiteUrl);
  const invalidBanner = !!bannerUrl && !/^https?:\/\//i.test(bannerUrl);

  return (
    <div className="space-y-4">
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field data-invalid={invalidBanner}>
          <FieldLabel htmlFor={ids.banner}>URL del banner</FieldLabel>
          <Input
            id={ids.banner}
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://..."
          />
          {invalidBanner && (
            <FieldError errors={[{ message: "URL inválida" }]} />
          )}
        </Field>
        <Field data-invalid={invalidWebsite}>
          <FieldLabel htmlFor={ids.website}>Sitio web</FieldLabel>
          <Input
            id={ids.website}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://..."
          />
          {invalidWebsite && (
            <FieldError errors={[{ message: "URL inválida" }]} />
          )}
        </Field>
      </FieldGroup>

      <Button
        onClick={onSubmit}
        disabled={isPending || invalidWebsite || invalidBanner}
      >
        {isPending ? <Spinner /> : "Guardar"}
      </Button>
    </div>
  );
};
