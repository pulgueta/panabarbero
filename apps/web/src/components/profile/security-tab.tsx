import { passkey, useListPasskeys } from "@panabarbero/convex/auth";
import type { UserProfileData } from "@panabarbero/convex/schemas";
import { Fingerprint } from "lucide-react";
import type { ActivityProps, FC } from "react";
import { Activity } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

interface SecurityTabProps {
  profile: UserProfileData | null;
}

export const SecurityTab: FC<SecurityTabProps> = () => {
  const {
    data: passkeys,
    isPending: isLoadingPasskeys,
    isRefetching: isRefetchingPasskeys,
  } = useListPasskeys();

  const passkeysMode: ActivityProps["mode"] =
    isLoadingPasskeys || isRefetchingPasskeys ? "hidden" : "visible";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-semibold text-3xl">Seguridad de tu cuenta</h1>
        <p className="text-muted-foreground text-sm">
          Administra la seguridad de tu cuenta
        </p>
      </header>

      <section className="grid w-full gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Passkeys</CardTitle>
            <CardDescription>
              Crea y administra tus passkeys para iniciar sesión sin contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isLoadingPasskeys || isRefetchingPasskeys) && (
              <Skeleton className="h-64 w-full" />
            )}

            <Activity mode={passkeysMode}>
              {passkeys?.map((passkey) => (
                <div key={passkey.id}>
                  <p>{passkey.name}</p>
                  <p>{passkey.id}</p>
                </div>
              ))}
            </Activity>

            {passkeys?.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Fingerprint />
                  </EmptyMedia>
                </EmptyHeader>
                <EmptyTitle>No hay passkeys creadas</EmptyTitle>
                <EmptyDescription>
                  Cuando crees una passkey, podrás verla aquí.
                </EmptyDescription>
              </Empty>
            )}
          </CardContent>
          <CardFooter className="justify-end pt-0">
            <Button
              disabled
              onClick={async () => {
                try {
                  await passkey.addPasskey();
                } catch (error) {
                  console.log(error);
                }
              }}
            >
              {passkeys?.length ? "Agregar" : "Crear"} passkey
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
};
