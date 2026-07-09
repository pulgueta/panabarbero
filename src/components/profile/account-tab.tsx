import type { UserProfileData } from "@convex/schema";
import { formatPhoneNumber } from "@convex/utils";
import { InfoIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import { ProfilePhotoUploader } from "@/components/profile/profile-photo-uploader";
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
  FieldDescription,
  FieldLabel,
  Field as FieldRoot,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { usePlan } from "@/hooks/billing/use-plan";
import { useProfileActions } from "@/hooks/use-profile";

const CreateBarbershopDialog = lazy(() =>
  import("@/components/barbershops/create-barbershop-dialog").then((mod) => ({
    default: mod.CreateBarbershopDialog,
  })),
);

const PricingDialog = lazy(() =>
  import("@/components/pricing/pricing-dialog").then((mod) => ({
    default: mod.PricingDialog,
  })),
);

const BarberScheduleCard = lazy(() =>
  import("@/components/profile/barber-schedule-card").then((mod) => ({
    default: mod.BarberScheduleCard,
  })),
);

const BARBERSHOP_BANNER_HIDE_KEY = "barbershop-create-banner-hide-until";

interface AccountTabProps {
  profile: UserProfileData;
  isBarber: boolean;
  userId: string;
}

type NotificationPreferenceType =
  UserProfileData["notificationsPreferences"][number]["type"];

interface NotificationSwitchFieldProps {
  checked?: boolean;
  disabled?: boolean;
  disabledDescription?: string;
  label: string;
  onCheckedChange: (type: NotificationPreferenceType, enabled: boolean) => void;
  type: NotificationPreferenceType;
}

const NotificationSwitchField: FC<NotificationSwitchFieldProps> = ({
  checked,
  disabled,
  disabledDescription,
  label,
  onCheckedChange,
  type,
}) => (
  <FieldRoot orientation="horizontal">
    <FieldLabel>{label}</FieldLabel>
    <FieldContent className="items-end">
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(val) => onCheckedChange(type, val)}
      />
      {disabled && disabledDescription && (
        <FieldDescription className="max-w-56 text-right text-xs">
          {disabledDescription}
        </FieldDescription>
      )}
    </FieldContent>
  </FieldRoot>
);

export const AccountTab: FC<AccountTabProps> = ({
  profile,
  isBarber,
  userId,
}) => {
  const {
    updateNameMutation: { mutateAsync: updateName, isPending: isUpdatingName },
    updatePhoneNumberMutation: {
      mutateAsync: updatePhoneNumber,
      isPending: isUpdatingPhoneNumber,
    },
    updateNotificationPreferenceMutation: {
      mutateAsync: updateNotificationPreference,
    },
  } = useProfileActions();

  const [name, setName] = useState<string>(profile?.name ?? "");
  const [phone, setPhone] = useState<string>(
    profile?.phoneNumber ? formatPhoneNumber(profile.phoneNumber) : "",
  );
  const [showBarbershopBanner, setShowBarbershopBanner] =
    useState<boolean>(false);

  const { isSubscribed } = usePlan();
  const emailPreference = profile?.notificationsPreferences.find(
    (p) => p.type === "email",
  );
  const smsPreference = profile?.notificationsPreferences.find(
    (p) => p.type === "sms",
  );
  const whatsappPreference = profile?.notificationsPreferences.find(
    (p) => p.type === "whatsapp",
  );
  const updatePreference = (
    type: NotificationPreferenceType,
    enabled: boolean,
  ) => updateNotificationPreference({ type, enabled, userId });

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
    setName(profile?.name ?? "");
  }, [profile?.name]);

  useEffect(() => {
    setPhone(
      profile?.phoneNumber ? formatPhoneNumber(profile.phoneNumber) : "",
    );
  }, [profile?.phoneNumber]);

  return (
    <div className="space-y-4">
      {!isBarber && userId && showBarbershopBanner && (
        <Alert className="w-full md:max-w-md">
          <InfoIcon className="size-4" />
          <AlertTitle className="mb-1">¿Tienes una barbería?</AlertTitle>
          <AlertDescription>
            Gestiona reservas, barberos, servicios sin costo. <br />
            <Button
              variant="link"
              className="px-0 text-muted-foreground text-xs md:text-sm"
              onClick={handleHideBanner}
            >
              Ocultar por 7 días
            </Button>
            <br />
            <Suspense fallback={<Button disabled>Crear mi barbería</Button>}>
              {isSubscribed ? (
                <CreateBarbershopDialog
                  trigger={
                    <Button className="mt-1.5">Crear mi barbería</Button>
                  }
                  userId={userId}
                />
              ) : (
                <PricingDialog
                  trigger={<Button className="mt-1.5">Adquirir plan</Button>}
                />
              )}
            </Suspense>
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
          <CardDescription>
            Sube una foto para personalizar tu perfil. Máximo 5 MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilePhotoUploader userName={profile?.name} />
        </CardContent>
      </Card>

      <div className="grid w-full gap-4 md:grid-cols-2 [&_p]:text-xs">
        <Card>
          <CardHeader>
            <CardTitle>Nombre completo</CardTitle>
            <CardDescription>
              Este es el nombre que se mostrará en tu perfil de{" "}
              {isBarber ? "barbería." : "usuario."}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    defaultCountry="CO"
                    placeholder="300 444 1122"
                    disabled={isUpdatingPhoneNumber}
                    className="min-w-0 flex-1"
                  />
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        updatePhoneNumber({
                          phoneNumber: phone?.trim()
                            ? formatPhoneNumber(phone)
                            : "",
                        })
                      }
                      disabled={isUpdatingPhoneNumber}
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await updatePhoneNumber({ clearPhoneNumber: true });
                        setPhone("");
                      }}
                      disabled={
                        isUpdatingPhoneNumber ||
                        (!profile?.phoneNumber && !phone?.trim())
                      }
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              </FieldContent>
            </FieldRoot>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferencias de notificación</CardTitle>
            <CardDescription>
              Selecciona cómo deseas recibir avisos de cuenta, citas y alertas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <NotificationSwitchField
              checked={emailPreference?.enabled}
              label="Correo electrónico"
              onCheckedChange={updatePreference}
              type="email"
            />
            <NotificationSwitchField
              checked={whatsappPreference?.enabled}
              disabled={!profile?.phoneNumber}
              disabledDescription="Agrega un celular para activar avisos por WhatsApp."
              label="WhatsApp"
              onCheckedChange={updatePreference}
              type="whatsapp"
            />
            <NotificationSwitchField
              checked={smsPreference?.enabled}
              disabled={!profile?.phoneNumber}
              disabledDescription="Agrega un celular para activar alertas por SMS."
              label="SMS"
              onCheckedChange={updatePreference}
              type="sms"
            />
          </CardContent>
        </Card>
      </div>

      {isBarber && (
        <Suspense fallback={<Skeleton className="h-full w-full rounded-xl" />}>
          <BarberScheduleCard userId={userId} />
        </Suspense>
      )}
    </div>
  );
};
