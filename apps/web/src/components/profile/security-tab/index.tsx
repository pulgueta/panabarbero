import type { FC } from "react";
import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const LinkedAccountsSection = lazy(() =>
  import("./linked-accounts").then((module) => ({
    default: module.LinkedAccountsSection,
  })),
);

const PasswordResetSection = lazy(() =>
  import("./password-reset").then((module) => ({
    default: module.PasswordResetSection,
  })),
);

export const SecurityTab: FC = () => {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-semibold text-2xl">Seguridad de tu cuenta</h1>
        <p className="text-muted-foreground text-sm">
          Administra la seguridad de tu cuenta
        </p>
      </header>

      <section className="grid w-full gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <LinkedAccountsSection />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <PasswordResetSection />
        </Suspense>
        {/* <PasskeysSection /> */}
        {/* <TwoFactorSection /> */}
      </section>
    </div>
  );
};
