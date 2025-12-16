import type { UserProfileData } from "@panabarbero/convex/schemas";
import { InfoIcon } from "lucide-react";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CreateBarbershopDialog } from "@/components/barbershops/create-barbershop-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FieldContent,
  FieldLabel,
  Field as FieldRoot,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useProfileActions } from "@/hooks/use-profile";

const BARBERSHOP_BANNER_HIDE_KEY = "barbershop-create-banner-hide-until";

interface AccountTabProps {
  profile: UserProfileData | null;
  isBarber: boolean;
  userId: string;
}

export const AccountTab: FC<AccountTabProps> = ({
  profile,
  isBarber,
  userId,
}) => {
  const {
    updateNameMutation: {
      mutateAsync: updateName,
      isPending: isUpdatingName,
      isSuccess: isUpdatedName,
    },
    updatePhoneNumberMutation: {
      mutateAsync: updatePhoneNumber,
      isPending: isUpdatingPhoneNumber,
      isSuccess: isUpdatedPhoneNumber,
    },
    updateNotificationPreferenceMutation: {
      mutateAsync: updateNotificationPreference,
      isSuccess: isUpdatedNotificationPreference,
    },
  } = useProfileActions();

  const [name, setName] = useState<string>(profile?.name ?? "");
  const [phone, setPhone] = useState<string>(profile?.phoneNumber ?? "");
  const [showBarbershopBanner, setShowBarbershopBanner] =
    useState<boolean>(false);

  useEffect(() => {
    const checkBannerVisibility = () => {
      if (typeof window === "undefined") return false;

      const hideUntil = localStorage.getItem(BARBERSHOP_BANNER_HIDE_KEY);
      if (!hideUntil) {
        return true;
      }

      const hideUntilDate = new Date(parseInt(hideUntil, 10));
      const now = new Date();
      return now >= hideUntilDate;
    };

    setShowBarbershopBanner(checkBannerVisibility());
  }, []);

  const handleHideBanner = () => {
    const hideUntil = new Date();
    hideUntil.setDate(hideUntil.getDate() + 7);
    localStorage.setItem(
      BARBERSHOP_BANNER_HIDE_KEY,
      hideUntil.getTime().toString(),
    );
    setShowBarbershopBanner(false);
  };

  useEffect(() => {
    if (isUpdatedName) {
      toast.success("Guardado exitosamente", {
        description: "El nombre se ha actualizado correctamente.",
      });
    }

    if (isUpdatedPhoneNumber) {
      toast.success("Guardado exitosamente", {
        description: "El número de contacto se ha actualizado correctamente.",
      });
    }

    if (isUpdatedNotificationPreference) {
      toast.success("Guardado exitosamente", {
        description:
          "Las preferencias de notificación se han actualizado correctamente.",
      });
    }
  }, [isUpdatedName, isUpdatedPhoneNumber, isUpdatedNotificationPreference]);

  useEffect(() => {
    setName(profile?.name ?? "");
  }, [profile?.name]);

  useEffect(() => {
    setPhone(profile?.phoneNumber ?? "");
  }, [profile?.phoneNumber]);

  return (
    <div className="space-y-6">
      {!isBarber && userId && showBarbershopBanner && (
        <Alert variant="info" className="relative">
          <InfoIcon className="size-4" />
          <AlertTitle>¿Tienes una barbería?</AlertTitle>
          <AlertDescription className="pr-20">
            Gestiona reservas, barberos, servicios y obtén acceso a analíticas
            detalladas de tu negocio sin costo adicional. <br />
            <CreateBarbershopDialog
              trigger={
                <Button variant="outline" className="mt-1.5">
                  Crear mi barbería
                </Button>
              }
              userId={userId}
            />
          </AlertDescription>
          <Button
            variant="link"
            className="absolute top-2 right-2 text-muted-foreground"
            onClick={handleHideBanner}
          >
            Ocultar por 7 días
          </Button>
        </Alert>
      )}

      <div className="grid w-full gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nombre completo</CardTitle>
            <CardDescription>
              {isBarber
                ? "Este es el nombre que se mostrará en tu perfil de barbería"
                : "Este es el nombre que se mostrará en tu perfil de usuario"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldRoot>
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    disabled={isUpdatingName}
                  />
                  <Button
                    onClick={() => updateName({ name: name ?? "" })}
                    disabled={isUpdatingName}
                  >
                    Guardar
                  </Button>
                </div>
              </FieldContent>
            </FieldRoot>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Correo electrónico</CardTitle>
            <CardDescription>
              Para usar otro correo, inicia sesión con el nuevo correo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldRoot>
              <FieldContent>
                <Input
                  type="email"
                  value={profile?.email}
                  autoComplete="email"
                  disabled
                />
              </FieldContent>
            </FieldRoot>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Número de contacto</CardTitle>
            <CardDescription>
              Este es el número donde te enviaremos avisos de la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldRoot>
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="3014441122"
                    autoComplete="tel"
                    type="tel"
                    pattern="[0-9]*"
                    maxLength={10}
                    disabled={isUpdatingPhoneNumber}
                  />
                  <Button
                    onClick={() =>
                      updatePhoneNumber({ phoneNumber: phone ?? "" })
                    }
                    disabled={isUpdatingPhoneNumber}
                  >
                    Guardar
                  </Button>
                </div>
              </FieldContent>
            </FieldRoot>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferencias de notificación</CardTitle>
            <CardDescription>
              Selecciona los canales por los cuales deseas recibir
              notificaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRoot orientation="horizontal">
              <FieldLabel>Email</FieldLabel>
              <FieldContent className="items-end">
                <Switch
                  checked={
                    profile?.notificationsPreferences.find(
                      (p) => p.type === "email",
                    )?.enabled
                  }
                  onCheckedChange={(val) =>
                    updateNotificationPreference({
                      type: "email",
                      enabled: val,
                      userId,
                    })
                  }
                />
              </FieldContent>
            </FieldRoot>

            <FieldRoot orientation="horizontal">
              <FieldLabel>Mensaje de texto (SMS)</FieldLabel>
              <FieldContent className="items-end">
                <Switch
                  checked={
                    profile?.notificationsPreferences.find(
                      (p) => p.type === "sms",
                    )?.enabled
                  }
                  disabled={!profile?.phoneNumber}
                  onCheckedChange={(val) =>
                    updateNotificationPreference({
                      type: "sms",
                      enabled: val,
                      userId,
                    })
                  }
                />
              </FieldContent>
            </FieldRoot>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
