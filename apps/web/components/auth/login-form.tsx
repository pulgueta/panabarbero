"use client";

import { signIn } from "@panabarbero/auth/client";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export const LoginForm = () => {
  const { push } = useRouter();

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      <Button
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
      </Button>
    </div>
  );
};
