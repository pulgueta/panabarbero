import type { UserProfileData } from "@panabarbero/convex/schemas";
import type { FC } from "react";

interface SecurityTabProps {
  profile: UserProfileData | null;
}

export const SecurityTab: FC<SecurityTabProps> = () => {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold text-lg">Seguridad de tu cuenta</h3>
        <p className="text-muted-foreground text-sm">
          Administra la seguridad de tu cuenta. TODO: Passkeys
        </p>
      </section>
    </div>
  );
};
