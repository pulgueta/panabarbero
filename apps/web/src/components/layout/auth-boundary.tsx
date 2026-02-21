import { AuthBoundary } from "@convex-dev/better-auth/react";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import type { FC, PropsWithChildren } from "react";

import { authClient } from "@/lib/auth-client";
import { isAuthError } from "@/lib/utils";

interface ClientAuthBoundaryProps extends PropsWithChildren {}

export const ClientAuthBoundary: FC<ClientAuthBoundaryProps> = ({
  children,
}) => {
  const navigate = useNavigate();

  return (
    <AuthBoundary
      authClient={authClient}
      onUnauth={() => navigate({ to: "/login" })}
      getAuthUserFn={api.auth.getAuthUser}
      isAuthError={isAuthError}
    >
      {children}
    </AuthBoundary>
  );
};
