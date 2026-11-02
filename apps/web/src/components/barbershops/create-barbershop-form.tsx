import { revalidateLogic } from "@tanstack/react-form";
import type { FC } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";
import { useColombia } from "@/hooks/use-colombia";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { barbershopFormSchema } from "@/lib/schemas";
import { useLocationStore } from "@/store/barbershop-filters";

interface CreateBarbershopFormProps {
  userId: string | undefined;
  onSuccess: () => void;
}

export const CreateBarbershopForm: FC<CreateBarbershopFormProps> = ({
  userId,
  onSuccess,
}) => {
  const haptic = useWebHaptics();

  const { states, citiesFromState } = useColombia();

  const state = useLocationStore((s) => s.state);
  const city = useLocationStore((s) => s.city);
  const setLocationState = useLocationStore((s) => s.setState);
  const setLocationCity = useLocationStore((s) => s.setCity);

  const {
    createBarbershopMutation: { mutateAsync: createBarbershop },
  } = useBarbershopActions();

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - zod coerce/default input types don't match the form values
      onSubmit: barbershopFormSchema,
    },
    defaultValues: {
      name: "",
      address: {
        fullAddress: "",
        details: undefined as string | undefined,
      },
      city: city ?? "",
      state: state ?? "",
      zipCode: "",
      contactPhone: "",
      isActive: false,
      gracePeriodMinutes: 5,
      availability: [
        {
          weekDay: {
            day: "monday" as const,
            isActive: true,
          },
          openAt: "09:00",
          closeAt: "18:00",
        },
      ],
      ownerIsBarber: true,
    },
    onSubmit: async ({ value }) => {
      if (!userId) return;

      const { ownerIsBarber, ...barbershopData } = value;

      try {
        const barbershopId = await createBarbershop({
          barbershop: {
            ...barbershopData,
            gracePeriodMinutes: Number(value.gracePeriodMinutes),
            ownerId: userId,
            services: [],
          },
          ownerIsBarber,
        });

        if (barbershopId) {
          haptic.trigger("success");
          toast.success("Barbería creada exitosamente");
          onSuccess();
        }
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
        return;
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="w-full space-y-4"
    >
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-2 gap-4">
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Nombre"
                placeholder="Ej. Barbería Central"
              />
            )}
          </form.AppField>

          <form.AppField name="address.fullAddress">
            {(field) => (
              <field.TextField
                label="Dirección completa"
                placeholder="Calle 123 #45-67"
              />
            )}
          </form.AppField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form.AppField
            name="state"
            listeners={{
              onChange: ({ value }) => {
                setLocationState(value || undefined);
                // Clear both the form field and the shared store so the global
                // filter can't keep a city that doesn't belong to the new state.
                setLocationCity(undefined);
                form.setFieldValue("city", "");
              },
            }}
          >
            {(field) => (
              <field.SelectField
                label="Departamento"
                placeholder="Selecciona departamento"
                className="w-full bg-background dark:bg-card"
                options={states.map((s) => ({
                  value: s.state,
                  label: s.state,
                }))}
              />
            )}
          </form.AppField>

          <form.Subscribe selector={(s) => s.values.state}>
            {(selectedState) => (
              <form.AppField
                name="city"
                listeners={{
                  onChange: ({ value }) => {
                    setLocationCity(value || undefined);
                  },
                }}
              >
                {(field) => (
                  <field.SelectField
                    label="Ciudad"
                    placeholder="Selecciona ciudad"
                    className="w-full bg-background dark:bg-card"
                    disabled={!selectedState}
                    options={(selectedState
                      ? citiesFromState(selectedState)
                      : []
                    ).map((c) => ({ value: c, label: c }))}
                  />
                )}
              </form.AppField>
            )}
          </form.Subscribe>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <form.AppField name="ownerIsBarber">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel>Tu rol en la barbería</FieldLabel>
                <RadioGroup
                  value={field.state.value ? "owner-barber" : "owner-only"}
                  onValueChange={(value) =>
                    field.handleChange(value === "owner-barber")
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="owner-barber" id="owner-barber" />
                    <Label htmlFor="owner-barber" className="cursor-pointer">
                      Dueño y barbero
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="owner-only" id="owner-only" />
                    <Label htmlFor="owner-only" className="cursor-pointer">
                      Solo dueño
                    </Label>
                  </div>
                </RadioGroup>
                {field.state.meta.errors.length > 0 && (
                  <FieldError
                    errors={field.state.meta.errors.map((e) => ({
                      message: String(e),
                    }))}
                  />
                )}
              </Field>
            )}
          </form.AppField>

          <form.AppField name="gracePeriodMinutes">
            {(field) => (
              <field.TextField
                label="Periodo de gracia"
                description="Tiempo que el cliente puede llegar tarde sin que se le cancele la cita."
                placeholder="Ej. 5"
                type="number"
                className="w-full tabular-nums"
              />
            )}
          </form.AppField>
        </div>
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton label="Crear barbería" className="w-full" />
      </form.AppForm>
    </form>
  );
};
