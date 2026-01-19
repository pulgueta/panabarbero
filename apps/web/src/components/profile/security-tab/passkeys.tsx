import { passkey, useListPasskeys } from "@panabarbero/convex/auth";
import { Fingerprint } from "lucide-react";
import type { ActivityProps } from "react";
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

export const PasskeysSection = () => {
  const {
    data: passkeys,
    isPending: isLoadingPasskeys,
    isRefetching: isRefetchingPasskeys,
  } = useListPasskeys();

  const passkeysMode: ActivityProps["mode"] =
    isLoadingPasskeys || isRefetchingPasskeys ? "hidden" : "visible";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Crea y administra tus passkeys para iniciar sesión con tu biometría
          entre dispositivos.
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
              const pk = await passkey.addPasskey();
              console.log(pk);
            } catch (error) {
              console.log(error);
            }
          }}
        >
          {passkeys?.length ? "Agregar" : "Crear"} passkey
        </Button>
      </CardFooter>
    </Card>
  );
};
