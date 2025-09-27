import { TimePicker } from "@/components/time-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DAY_MAPPING,
  DAYS_OF_WEEK,
  handleFormSubmit,
  SOCIAL_PLATFORMS,
} from "@/lib/form-utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/barbershops/new")({
  component: NewBarbershopPage,
});

function NewBarbershopPage() {
  const navigate = useNavigate();

  // Basic Information
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState("5");

  // Available Days
  const [availableDays, setAvailableDays] = useState<
    Record<string, { open: string; close: string; active: boolean }>
  >({
    lunes: { open: "09:00", close: "18:00", active: true },
    martes: { open: "09:00", close: "18:00", active: true },
    miércoles: { open: "09:00", close: "18:00", active: true },
    jueves: { open: "09:00", close: "18:00", active: true },
    viernes: { open: "09:00", close: "18:00", active: true },
    sábado: { open: "09:00", close: "14:00", active: true },
    domingo: { open: "", close: "", active: false },
  });

  // Social Media
  const [socialMedia, setSocialMedia] = useState<
    Array<{ platform: string; url: string }>
  >([]);
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");

  function handleAddSocialMedia() {
    if (newSocialPlatform && newSocialUrl) {
      setSocialMedia([
        ...socialMedia,
        { platform: newSocialPlatform, url: newSocialUrl },
      ]);
      setNewSocialPlatform("");
      setNewSocialUrl("");
      toast.success("Red social agregada");
    }
  }

  function handleRemoveSocialMedia(index: number) {
    setSocialMedia(socialMedia.filter((_, i) => i !== index));
    toast.success("Red social eliminada");
  }

  function handleDayChange(
    day: string,
    field: "open" | "close" | "active",
    value: string | boolean,
  ) {
    setAvailableDays((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Prepare data for submission
    const formData = {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      contactPhone,
      contactEmail,
      websiteUrl,
      bannerUrl,
      isActive,
      gracePeriodMinutes: parseInt(gracePeriodMinutes, 10),
      availableDays: Object.entries(availableDays).reduce(
        (acc, [spanishDay, data]) => {
          const englishDay =
            DAY_MAPPING[spanishDay as keyof typeof DAY_MAPPING];
          acc[englishDay] = data.active
            ? { open: data.open, close: data.close }
            : null;
          return acc;
        },
        {} as any,
      ),
      socialMedia,
    };

    handleFormSubmit(formData);
    toast.success("Barbería creada exitosamente");

    // Navigate back to barbershops list
    navigate({ to: "/barbershops" });
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Barbería</CardTitle>
            <CardDescription>
              Complete la información para registrar una nueva barbería
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Información Básica</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Barbería El Clásico"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Teléfono de Contacto</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Ej: 3001234567"
                    type="tel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe los servicios y especialidades de la barbería..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Correo Electrónico</Label>
                  <Input
                    id="contactEmail"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    type="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Sitio Web</Label>
                  <Input
                    id="websiteUrl"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://ejemplo.com"
                    type="url"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bannerUrl">URL del Banner</Label>
                <Input
                  id="bannerUrl"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://ejemplo.com/banner.jpg"
                  type="url"
                />
              </div>
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Ubicación</h3>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle 123 #45-67"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bogotá"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Departamento *</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Cundinamarca"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">Código Postal</Label>
                  <Input
                    id="zipCode"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="110111"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Operating Hours */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Horario de Atención</h3>

              {DAYS_OF_WEEK.map((day) => (
                <TimePicker
                  key={day}
                  day={day}
                  open={availableDays[day].open}
                  close={availableDays[day].close}
                  isActive={availableDays[day].active}
                  onOpenChange={(value) => handleDayChange(day, "open", value)}
                  onCloseChange={(value) =>
                    handleDayChange(day, "close", value)
                  }
                  onActiveChange={(value) =>
                    handleDayChange(day, "active", value)
                  }
                />
              ))}
            </div>

            <Separator />

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Redes Sociales</h3>

              <div className="space-y-2">
                {socialMedia.map((social, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {social.platform}
                    </Badge>
                    <span className="flex-1 text-muted-foreground text-sm">
                      {social.url}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSocialMedia(index)}
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
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
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
                  Agregar Red Social
                </Button>
              </div>
            </div>

            <Separator />

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Configuración</h3>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Barbería Activa</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gracePeriod">Período de Gracia (minutos)</Label>
                <Input
                  id="gracePeriod"
                  type="number"
                  value={gracePeriodMinutes}
                  onChange={(e) => setGracePeriodMinutes(e.target.value)}
                  placeholder="5"
                  min="0"
                  max="60"
                />
                <p className="text-muted-foreground text-sm">
                  Tiempo de espera antes de cancelar una cita por no presentarse
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/barbershops" })}
              >
                Cancelar
              </Button>
              <Button type="submit">Crear Barbería</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
