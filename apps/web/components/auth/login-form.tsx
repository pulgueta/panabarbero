"use client";

import { getLastUsedLoginMethod, signIn } from "@panabarbero/auth/client";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const LoginForm = () => {
  const { push } = useRouter();

  const lastLoginMethod = getLastUsedLoginMethod();

  const loginProviders = [
    {
      provider: "google",
      label: "Google",
      id: "google",
    },
    {
      provider: "passkey",
      label: "Passkey",
      id: "passkey",
    },
  ];

  return (
    <Container className="grid w-full grid-cols-1 gap-4" variant="xs">
      {loginProviders.map((provider) => (
        <div key={provider.id} className="relative">
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={async () => {
              await signIn.social(
                {
                  provider: provider.provider,
                },
                {
                  onSuccess: () => {
                    push("/dashboard");
                  },
                },
              );
            }}
          >
            {provider.label}
          </Button>
          {lastLoginMethod === provider.id && (
            <Badge className="-top-2 -right-2 absolute">Último usado</Badge>
          )}
        </div>
      ))}
      {/* <Button
        variant="outline"
        type="button"
        className="w-full"
        onClick={async () => {
          await signIn.social(
            {
              provider: "google",
            },
            {
              onSuccess: () => {
                push("/");
              },
            },
          );
        }}
      >
        Google
      </Button>
      <Button variant="outline" type="button" className="w-full">
        <KeyRound />
        Passkey
      </Button> */}
    </Container>
  );
};
