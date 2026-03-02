import { Authenticated, AuthLoading } from "convex/react";
import type { FC, PropsWithChildren } from "react";

import { LoadingComponent } from "@/components/layout/loading-component";

interface AuthBoundaryProps extends PropsWithChildren {}

export const AuthBoundary: FC<AuthBoundaryProps> = ({ children }) => {
  return (
    <>
      <AuthLoading>
        <LoadingComponent />
      </AuthLoading>
      <Authenticated>{children}</Authenticated>
    </>
  );
};
