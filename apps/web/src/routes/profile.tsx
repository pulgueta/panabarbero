import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useProfile, useProfileActions } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: user } = useSession();

  // if (!user) {
  //   throw redirect({
  //     to: "/login",
  //   });
  // }

  const { data: profile, isLoading: isProfileLoading } = useProfile(
    user?.userId ?? "",
  );
  const {
    updateNameMutation: {
      mutateAsync: updateName,
      isPending: updateNameLoading,
    },
    updateEmailMutation: {
      mutateAsync: updateEmail,
      isPending: updateEmailLoading,
    },
    updatePhoneNumberMutation: {
      mutateAsync: updatePhoneNumber,
      isPending: updatePhoneNumberLoading,
    },
    updateNotificationPreferenceMutation: {
      mutateAsync: updateNotificationPreference,
      isPending: updateNotificationPreferenceLoading,
    },
  } = useProfileActions();

  const [name, setName] = useState<string | undefined>(profile?.name);
  const [email, setEmail] = useState<string | undefined>(profile?.email);
  const [phone, setPhone] = useState<string | undefined>(profile?.phoneNumber);

  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-65px)] flex-col items-start justify-start border-x px-4 py-8 md:px-8 lg:px-16">
      <h1 className="mb-6 font-bold text-3xl tracking-tight">Mi Perfil</h1>

      <div className="grid w-full gap-6 md:grid-cols-2">
        <Card>
          <CardContent>
            <Field>
              <FieldLabel>Nombre completo</FieldLabel>
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
                    disabled={isProfileLoading || updateNameLoading}
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
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    value={profile?.email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                  />
                  <Button
                    onClick={() => updateEmail({ email: email ?? "" })}
                    disabled={isProfileLoading || updateEmailLoading}
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
              <FieldContent>
                <div className="flex gap-3">
                  <Input
                    value={profile?.phoneNumber ?? ""}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="3000000000"
                    autoComplete="tel"
                    type="tel"
                  />
                  <Button
                    onClick={() =>
                      updatePhoneNumber({ phoneNumber: phone ?? "" })
                    }
                    disabled={isProfileLoading || updatePhoneNumberLoading}
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
                    isProfileLoading || updateNotificationPreferenceLoading
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
                    isProfileLoading || updateNotificationPreferenceLoading
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
