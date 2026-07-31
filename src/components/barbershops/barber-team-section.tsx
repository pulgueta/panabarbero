import type { BarbershopMemberWithName } from "@convex/schema";
import type { FC } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";

const ROLE_LABELS: Record<BarbershopMemberWithName["roles"][number], string> = {
  owner: "Dueño",
  barber: "Barbero",
  staff: "Staff",
};

interface BarberTeamSectionProps {
  barbers: BarbershopMemberWithName[];
}

/** Detail-page team card: one row per member with their roles. */
export const BarberTeamSection: FC<BarberTeamSectionProps> = ({ barbers }) => {
  return (
    <Card className="gap-0 py-0">
      <h2 className="border-b p-4 font-semibold tracking-tight">Equipo</h2>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber) => (
          <div className="flex min-w-0 items-center gap-4 p-4" key={barber._id}>
            <Avatar size="lg">
              {barber.avatarUrl && (
                <AvatarImage alt={barber.name} src={barber.avatarUrl} />
              )}
              <AvatarFallback>{getInitials(barber.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate font-medium text-sm">{barber.name}</p>
              <p className="text-muted-foreground text-xs">
                {barber.roles.map((role) => ROLE_LABELS[role]).join(" · ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
