import { CheckoutLink } from "@convex-dev/polar/react";
import { api } from "@convex/_generated/api";
import type { UserProfileData } from "@convex/schema";
import { InfoIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { lazy, Suspense, useEffect, useState } from "react";

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
import { usePlan } from "@/hooks/billing/use-plan";
import { usePricingPlans } from "@/hooks/billing/use-pricing";
import { useProfileActions } from "@/hooks/use-profile";

const CreateBarbershopDialog = lazy(() =>
  import("@/components/barbershops/create-barbershop-dialog").then((mod) => ({
    default: mod.CreateBarbershopDialog,
  })),
);

const BARBERSHOP_BANNER_HIDE_KEY = "barbershop-create-banner-hide-until";

interface AccountTabProps {
  profile: UserProfileData;
  isBarber: boolean;
  userId: string;
  /** Auth provider image URL (Google profile picture, etc.) */
  authProviderImage?: string | null;
}

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
  const [phone, setPhone] = useState<string>(profile?.phoneNumber ?? "");
  const [showBarbershopBanner, setShowBarbershopBanner] =
    useState<boolean>(false);

  const { isSubscribed } = usePlan();
  const { data: products } = usePricingPlans();

  const freeProduct = products.find((product) =>
    product.prices.find((price) => price.amountType === "free"),
  );

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
    setPhone(profile?.phoneNumber ?? "");
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
              <CreateBarbershopDialog
                trigger={
                  isSubscribed ? (
                    <Button className="mt-1.5">Crear mi barbería</Button>
                  ) : freeProduct ? (
                    <CheckoutLink
                      polarApi={{
                        generateCheckoutLink: api.polar.generateCheckoutLink,
                      }}
                      productIds={[freeProduct.id]}
                      // biome-ignore lint/correctness/noChildrenProp: can do
                      children={<Button>Adquirir plan</Button>}
                    />
                  ) : (
                    <Button disabled>Adquirir plan</Button>
                  )
                }
                userId={userId}
              />
            </Suspense>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid w-full gap-4 md:grid-cols-2 [&_p]:text-xs">
        {/* <ProfilePhotoUploader
          currentPhotoUrl={profile?.profilePhotoUrl ?? null}
          authProviderImage={authProviderImage}
          userName={profile?.name}
        /> */}
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
          <CardContent className="flex flex-col gap-2">
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
