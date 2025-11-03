import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useIsBarber } from "@/hooks/use-barbers";
import { useProfile, useProfileActions } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile")({
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
    updateEmailMutation: {
      mutateAsync: updateEmail,
      isPending: isUpdatingEmail,
      isSuccess: isUpdatedEmail,
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
  const [email, setEmail] = useState<string | undefined>(
    profile?.email ?? undefined,
  );
  const [phone, setPhone] = useState<string | undefined>(
    profile?.phoneNumber ?? undefined,
  );

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setPhone(profile.phoneNumber);
    }
  }, [profile]);

  useEffect(() => {
    if (isUpdatedName) {
      toast.success("Guardado exitosamente", {
        description: "El nombre se ha actualizado correctamente.",
      });
    }

    if (isUpdatedEmail) {
      toast.success("Guardado exitosamente", {
        description: "El correo electrónico se ha actualizado correctamente.",
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
  }, [
    isUpdatedEmail,
    isUpdatedName,
    isUpdatedPhoneNumber,
    isUpdatedNotificationPreference,
  ]);

  if (isUserLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-65px)] flex-col items-start justify-start border-x px-4 py-8 md:px-8 lg:px-16">
      <h1 className="mb-6 font-bold text-3xl tracking-tight">Mi Perfil</h1>

      <div className="grid w-full gap-6 md:grid-cols-2">
        <Card>
          <CardContent>
            <Field>
              <FieldLabel>Nombre completo</FieldLabel>
              <FieldDescription className="text-pretty">
                {isBarberLoading ? (
                  <Skeleton className="h-4 w-full" />
                ) : isBarber ? (
                  "Este es el nombre que se mostrará en tu perfil de barbería"
                ) : (
                  "Este es el nombre que se mostrará en tu perfil de usuario"
                )}
              </FieldDescription>
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
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
          <CardContent>
            <Field>
              <FieldLabel>Correo</FieldLabel>
              <FieldDescription className="text-pretty">
                A este correo se enviarán todas las notificaciones de la
                aplicación.
              </FieldDescription>
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                  />
                  <Button
                    onClick={() => updateEmail({ email: email ?? "" })}
                    disabled={isProfileLoading || isUpdatingEmail}
                  >
                    Guardar
                  </Button>
                </div>
              </FieldContent>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Field>
              <FieldLabel>Número de contacto</FieldLabel>
              <FieldDescription className="text-pretty">
                Este es el número donde te enviaremos avisos de la aplicación.
              </FieldDescription>
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="3000000000"
                    autoComplete="tel"
                    type="tel"
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
              <FieldLabel>SMS</FieldLabel>
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
    </div>
  );
}
