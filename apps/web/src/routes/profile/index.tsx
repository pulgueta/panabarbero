import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useIsBarber } from "@/hooks/use-barbers";
import { useProfile, useProfileActions } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: user, isLoading: isUserLoading } = useSession();

  const { data: profile, isLoading: isProfileLoading } = useProfile(
    user?.userId ?? "",
  );

  const { data: isBarber, isLoading: isBarberLoading } = useIsBarber(
    user?.userId ?? "",
  );

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
      isPending: isUpdatingNotificationPreference,
      isSuccess: isUpdatedNotificationPreference,
    },
  } = useProfileActions();

  const [name, setName] = useState<string | undefined>(
    profile?.name ?? undefined,
  );
  const [phone, setPhone] = useState<string | undefined>(
    profile?.phoneNumber ?? undefined,
  );

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

  if (isUserLoading) {
    return <LoadingComponent />;
  }

  return (
    <BorderContainer>
      <h1 className="mb-6 font-bold text-3xl tracking-tight">Mi Perfil</h1>

      <div className="grid w-full gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nombre completo</CardTitle>
            <CardDescription>
              {isBarberLoading || isProfileLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : isBarber ? (
                "Este es el nombre que se mostrará en tu perfil de barbería"
              ) : (
                "Este es el nombre que se mostrará en tu perfil de usuario"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    disabled={isProfileLoading || isUpdatingName}
                  />
                  <Button
                    onClick={() => updateName({ name: name ?? "" })}
                    disabled={isProfileLoading || isUpdatingName}
                  >
                    Guardar
                  </Button>
                </div>
              </FieldContent>
            </Field>
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
            <Field>
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    value={profile?.email}
                    autoComplete="email"
                    disabled
                  />
                </div>
              </FieldContent>
            </Field>
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
            <Field>
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="3000000000"
                    autoComplete="tel"
                    type="tel"
                    disabled={isProfileLoading || isUpdatingPhoneNumber}
                  />
                  <Button
                    onClick={() =>
                      updatePhoneNumber({ phoneNumber: phone ?? "" })
                    }
                    disabled={isProfileLoading || isUpdatingPhoneNumber}
                  >
                    Guardar
                  </Button>
                </div>
              </FieldContent>
            </Field>
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
            <Field orientation="horizontal">
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
                    })
                  }
                  disabled={
                    isProfileLoading || isUpdatingNotificationPreference
                  }
                />
              </FieldContent>
            </Field>
            {/* <Field orientation="horizontal">
              <FieldLabel>Push</FieldLabel>
              <FieldContent>
                <Switch
                  checked={
                    profile?.notificationsPreferences.find(
                      (p) => p.type === "push",
                    )?.enabled
                  }
                  onCheckedChange={(val) =>
                    updateNotificationPreference({ type: "push", enabled: val })
                  }
                  disabled={isProfileLoading || updateNotificationPreferenceLoading}
                />
              </FieldContent>
            </Field> */}
            <Field orientation="horizontal">
              <FieldLabel>Mensaje de texto (SMS)</FieldLabel>
              <FieldContent className="items-end">
                <Switch
                  checked={
                    profile?.notificationsPreferences.find(
                      (p) => p.type === "sms",
                    )?.enabled
                  }
                  onCheckedChange={(val) =>
                    updateNotificationPreference({ type: "sms", enabled: val })
                  }
                  disabled={
                    isProfileLoading || isUpdatingNotificationPreference
                  }
                />
              </FieldContent>
            </Field>
          </CardContent>
        </Card>
      </div>
    </BorderContainer>
  );
}
