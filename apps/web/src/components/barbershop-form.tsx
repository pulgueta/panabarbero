import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { handleFormSubmit } from "@/lib/form-utils";
import {
  type BarbershopFormData,
  barbershopFormSchema,
  dayMapping,
  socialPlatforms,
} from "@/lib/schemas";

interface BarbershopFormProps {
  onSuccess?: () => void;
  initialData?: Partial<BarbershopFormData>;
  mode?: "create" | "edit";
}

const DAYS_OF_WEEK = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
] as const;

export const BarbershopForm = ({
  onSuccess,
  initialData,
  mode = "create",
}: BarbershopFormProps) => {
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");

  const form = useForm<BarbershopFormData>({
    resolver: zodResolver(barbershopFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      address: initialData?.address ?? "",
      city: initialData?.city ?? "",
      state: initialData?.state ?? "",
      zipCode: initialData?.zipCode ?? "",
      contactPhone: initialData?.contactPhone ?? "",
      contactEmail: initialData?.contactEmail ?? "",
      websiteUrl: initialData?.websiteUrl ?? "",
      bannerUrl: initialData?.bannerUrl ?? "",
      isActive: initialData?.isActive ?? false,
      gracePeriodMinutes: initialData?.gracePeriodMinutes ?? 5,
      availableDays: initialData?.availableDays ?? {
        lunes: { open: "09:00", close: "18:00", active: true },
        martes: { open: "09:00", close: "18:00", active: true },
        miércoles: { open: "09:00", close: "18:00", active: true },
        jueves: { open: "09:00", close: "18:00", active: true },
        viernes: { open: "09:00", close: "18:00", active: true },
        sábado: { open: "09:00", close: "14:00", active: true },
        domingo: { open: "", close: "", active: false },
      },
      socialMedia: initialData?.socialMedia ?? [],
    },
  });

  const {
    fields: socialMediaFields,
    append: appendSocialMedia,
    remove: removeSocialMedia,
  } = useFieldArray({
    control: form.control,
    name: "socialMedia",
  });

  const handleAddSocialMedia = () => {
    if (newSocialPlatform && newSocialUrl) {
      appendSocialMedia({
        platform: newSocialPlatform as Exclude<
          (typeof socialPlatforms)[number],
          ""
        >,
        url: newSocialUrl,
      });
      setNewSocialPlatform("");
      setNewSocialUrl("");
      toast.success("Red social agregada");
    }
  };

  const onSubmit = (data: BarbershopFormData) => {
    // Transform available days to match backend format
    const transformedData = {
      ...data,
      availableDays: Object.entries(data.availableDays).reduce(
        (acc, [spanishDay, dayData]) => {
          const englishDay = dayMapping[spanishDay as keyof typeof dayMapping];
          acc[englishDay] = dayData.active
            ? { open: dayData.open, close: dayData.close }
            : null;
          return acc;
        },
        {} as Record<
          keyof typeof dayMapping,
          { open: string; close: string } | null
        >,
      ),
    };

    handleFormSubmit(transformedData);
    toast.success(
      mode === "create"
        ? "Barbería creada exitosamente"
        : "Barbería actualizada exitosamente",
    );

    onSuccess?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Información Básica</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Barbería El Clásico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono de Contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 3001234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe los servicios y especialidades de la barbería..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="correo@ejemplo.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sitio Web</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Location */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Ubicación</h3>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección *</FormLabel>
                <FormControl>
                  <Input placeholder="Calle 123 #45-67" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad *</FormLabel>
                  <FormControl>
                    <Input placeholder="Bogotá" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento *</FormLabel>
                  <FormControl>
                    <Input placeholder="Cundinamarca" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Postal</FormLabel>
                  <FormControl>
                    <Input placeholder="110111" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Operating Hours */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Horario de Atención</h3>

          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="flex items-center space-x-4 py-2">
              <FormField
                control={form.control}
                name={`availableDays.${day}.active`}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="w-24 font-medium capitalize">{day}</div>

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name={`availableDays.${day}.open`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="time"
                          className="w-32"
                          disabled={!form.watch(`availableDays.${day}.active`)}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <span className="text-muted-foreground text-sm">a</span>

                <FormField
                  control={form.control}
                  name={`availableDays.${day}.close`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="time"
                          className="w-32"
                          disabled={!form.watch(`availableDays.${day}.active`)}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Social Media */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Redes Sociales</h3>

          <div className="space-y-2">
            {socialMediaFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {field.platform}
                </Badge>
                <span className="flex-1 text-muted-foreground text-sm">
                  {field.url}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    removeSocialMedia(index);
                    toast.success("Red social eliminada");
                  }}
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select
              value={newSocialPlatform}
              onValueChange={setNewSocialPlatform}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plataforma" />
              </SelectTrigger>
              <SelectContent>
                {socialPlatforms.map((platform) => (
                  <SelectItem
                    key={platform}
                    value={platform}
                    className="capitalize"
                  >
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={newSocialUrl}
              onChange={(e) => setNewSocialUrl(e.target.value)}
              placeholder="URL del perfil"
            />

            <Button type="button" onClick={handleAddSocialMedia}>
              Agregar
            </Button>
          </div>
        </div>

        <Separator />

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Configuración</h3>

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Barbería Activa</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gracePeriodMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Período de Gracia (minutos)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10))
                    }
                  />
                </FormControl>
                <FormDescription>
                  Tiempo de espera antes de cancelar una cita por no presentarse
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit">
            {mode === "create" ? "Crear Barbería" : "Actualizar Barbería"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
