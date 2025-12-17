import { twoFactor } from "@panabarbero/convex/auth";
import { Shield } from "lucide-react";

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

export const TwoFactorSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Autenticación de dos factores (2FA)</CardTitle>
        <CardDescription>
          Activa la autenticación de dos factores para mejorar la seguridad de
          tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {true && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Shield />
              </EmptyMedia>
            </EmptyHeader>
            <EmptyTitle>No has activado el 2FA</EmptyTitle>
            <EmptyDescription>
              Aquí podrás administrar tu autenticación de dos factores.
            </EmptyDescription>
          </Empty>
        )}
      </CardContent>
      <CardFooter className="justify-end pt-0">
        <Button
          onClick={async () => {
            try {
              const twoFactorEnabled = await twoFactor.enable({
                password: "123456",
              });

              console.log(twoFactorEnabled);
            } catch (error) {
              console.log(error);
            }
          }}
        >
          Activar 2FA
        </Button>
      </CardFooter>
    </Card>
  );
};
