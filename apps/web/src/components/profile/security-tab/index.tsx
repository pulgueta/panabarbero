import type { FC } from "react";

// import { TwoFactorSection } from "./2fa";
import { LinkedAccountsSection } from "./linked-accounts";
import { PasswordResetSection } from "./password-reset";

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
        <LinkedAccountsSection />
        <PasswordResetSection />
        {/* <PasskeysSection /> */}
        {/* <TwoFactorSection /> */}
      </section>
    </div>
  );
};
