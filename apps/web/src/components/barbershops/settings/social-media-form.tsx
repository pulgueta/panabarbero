import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/use-barbershop";
import { socialPlatforms } from "@/lib/schemas";

type SocialRow = { platform: (typeof socialPlatforms)[number]; url: string };

interface SocialMediaFormProps {
  barbershop: Barbershop;
}

export const SocialMediaForm: FC<SocialMediaFormProps> = ({ barbershop }) => {
  const [social, setSocial] = useState<SocialRow[]>(
    barbershop.metadata?.socialMedia ?? [],
  );

  const {
    updateBarbershopMutation: {
      mutateAsync: updateBarbershop,
      isPending: isUpdatingBarbershop,
    },
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
        bannerUrl: barbershop.bannerUrl || undefined,
        metadata: {
          websiteUrl: barbershop.metadata?.websiteUrl || undefined,
          contactEmail: barbershop.metadata?.contactEmail || undefined,
          completedAppointments: barbershop.metadata?.completedAppointments,
          reviews: barbershop.metadata?.reviews,
          rating: barbershop.metadata?.rating,
          socialMedia: social.length ? social : undefined,
        },
      },
    });
  };

  const addRow = () =>
    setSocial((prev) => [...prev, { platform: "instagram", url: "" }]);
  const removeRow = (idx: number) =>
    setSocial((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, next: SocialRow) =>
    setSocial((prev) => prev.map((v, i) => (i === idx ? next : v)));

  return (
    <div className="space-y-4">
      <FieldGroup>
        {social.map((row, idx) => (
          <div
            key={`${row.platform}-${idx}`}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            <Field>
              <FieldLabel>Plataforma</FieldLabel>
              <Select
                value={row.platform}
                onValueChange={(v) =>
                  updateRow(idx, {
                    ...row,
                    platform: v as SocialRow["platform"],
                  })
                }
              >
                <SelectTrigger className="w-full bg-background dark:bg-card">
                  <SelectValue placeholder="Plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {socialPlatforms.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <Input
                value={row.url}
                onChange={(e) =>
                  updateRow(idx, { ...row, url: e.target.value })
                }
                placeholder="https://..."
              />
              <Button variant="destructive" onClick={() => removeRow(idx)}>
                Eliminar
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={addRow}>
          Agregar red social
        </Button>
      </FieldGroup>

      <Button onClick={onSubmit} disabled={isUpdatingBarbershop}>
        {isUpdatingBarbershop ? <Spinner /> : "Guardar"}
      </Button>
    </div>
  );
};
