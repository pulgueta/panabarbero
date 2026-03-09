import type { FC } from "react";
import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const PasswordResetSection = lazy(() =>
  import("./password-reset").then((module) => ({
    default: module.PasswordResetSection,
  })),
);

export const SecurityTab: FC = () => {
  return (
    <div className="space-y-4">
      <section className="grid w-full gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <PasswordResetSection />
        </Suspense>
        {/* <PasskeysSection /> */}
        {/* <TwoFactorSection /> */}
      </section>
    </div>
  );
};
