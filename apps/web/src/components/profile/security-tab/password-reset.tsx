import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, MailIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Item, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import {
  listAccounts,
  requestPasswordReset,
  useSession,
} from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/auth-schemas";

export const PasswordResetSection: FC = () => {
  const { data: session } = useSession();
  const [emailSent, setEmailSent] = useState(false);

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["linked-accounts"],
    queryFn: async () => listAccounts().then((res) => res.data),
  });
  const hasSocialAccount = accounts?.some(
    (account) => account.providerId !== "credential",
  );

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: session?.user?.email ?? "",
    },
  });

  const handleRequestReset = form.handleSubmit(async (data) => {
    try {
      await requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password",
      });
      setEmailSent(true);
      toast.success("Correo enviado", {
        description:
          "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      toast.error("Error al enviar correo de restablecimiento");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>
          Envía un correo para restablecer tu contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSocialAccount && (
          <p className="text-muted-foreground text-sm">
            Te enviaremos un enlace a tu correo electrónico para que puedas
            crear una nueva contraseña.
          </p>
        )}

        {emailSent && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950">
            <MailIcon className="size-8 text-green-600 dark:text-green-400" />
            <p className="font-medium text-green-800 text-sm dark:text-green-200">
              ¡Correo enviado!
            </p>
            <p className="text-green-700 text-xs dark:text-green-300">
              Revisa tu bandeja de entrada y sigue las instrucciones para crear
              una nueva contraseña.
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setEmailSent(false)}
            >
              Enviar de nuevo
            </Button>
          </div>
        )}

        {hasSocialAccount && (
          <Item variant="warning">
            <ItemTitle>
              <AlertCircleIcon className="size-4 text-warning" />
              Cuentas conectadas
            </ItemTitle>
            <ItemDescription className="text-warning">
              Tienes una cuenta social vinculada. Puedes usar esa cuenta para
              iniciar sesión sin contraseña.
            </ItemDescription>
          </Item>
        )}
      </CardContent>
      <CardFooter>
        <form onSubmit={handleRequestReset} className="w-full">
          <Button
            type="submit"
            variant="outline"
            disabled={
              form.formState.isSubmitting ||
              !!hasSocialAccount ||
              isLoadingAccounts
            }
            className="w-full"
          >
            {form.formState.isSubmitting && <Spinner />}
            Enviar correo de restablecimiento
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};
