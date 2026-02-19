import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { linkSocial, listAccounts, unlinkAccount } from "@/lib/auth-client";
import { GoogleIcon } from "@/routes/_auth/login";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { toast } from "sonner";

export const LinkedAccountsSection: FC = () => {
  const {
    data: accounts,
    isPending: isLoadingAccounts,
    refetch,
  } = useSuspenseQuery({
    queryKey: ["linked-accounts"],
    queryFn: async () => listAccounts().then((res) => res.data),
  });
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const googleAccount = accounts?.find((acc) => acc.providerId === "google");
  const hasEmailPassword = accounts?.find(
    (acc) => acc.providerId === "credential",
  );

  // Determine if we can unlink Google (must have another auth method)
  const canUnlinkGoogle =
    googleAccount && (hasEmailPassword || (accounts?.length ?? 0) > 1);

  const handleLinkGoogle = async () => {
    setLinkingProvider("google");
    try {
      await linkSocial({
        provider: "google",
        callbackURL: window.location.href,
      });
      // The redirect will happen automatically
    } catch (error) {
      console.error("Error linking Google account:", error);
      toast.error("Error al vincular cuenta de Google");
      setLinkingProvider(null);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!googleAccount) return;

    setUnlinkingId(googleAccount.id);
    try {
      await unlinkAccount({
        providerId: "google",
        accountId: googleAccount.accountId,
      });
      toast.success("Cuenta de Google desvinculada");
      refetch();
    } catch (error) {
      console.error("Error unlinking Google account:", error);
      toast.error("Error al desvincular cuenta de Google");
    } finally {
      setUnlinkingId(null);
    }
  };

  if (isLoadingAccounts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cuentas conectadas</CardTitle>
          <CardDescription>
            Vincula tus cuentas de redes sociales para iniciar sesión más
            rápido.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas conectadas</CardTitle>
        <CardDescription>
          Vincula tus cuentas de redes sociales para iniciar sesión más rápido.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google Account */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-6 items-center justify-center">
              <GoogleIcon />
            </div>
            <div>
              <p className="font-medium text-sm">Google</p>
              <p className="text-muted-foreground text-xs">
                {googleAccount ? "Vinculada" : "No vinculada"}
              </p>
            </div>
          </div>

          {googleAccount ? (
            <Button
              variant="outline"
              onClick={handleUnlinkGoogle}
              disabled={!canUnlinkGoogle || unlinkingId === googleAccount.id}
              title={
                !canUnlinkGoogle
                  ? "Debes tener otra forma de iniciar sesión para desvincular Google"
                  : undefined
              }
            >
              {unlinkingId === googleAccount.id && <Spinner />}
              Desvincular
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleLinkGoogle}
              disabled={linkingProvider === "google"}
            >
              {linkingProvider === "google" && <Spinner />}
              Vincular
            </Button>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          {!canUnlinkGoogle &&
            googleAccount &&
            "Para desvincular Google, primero configura una contraseña o vincula otra cuenta."}
        </p>
      </CardContent>
    </Card>
  );
};
