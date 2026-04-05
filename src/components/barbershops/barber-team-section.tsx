import type { BarbershopMemberWithName } from "@convex/schema";
import type { FC } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BarberTeamSectionProps {
  barbers: BarbershopMemberWithName[];
}

export const BarberTeamSection: FC<BarberTeamSectionProps> = ({ barbers }) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {barbers.map((barber) => (
        <div
          key={barber._id}
          className="flex items-center gap-4 rounded-lg border bg-card p-4"
        >
          <Avatar size="xl">
            {barber.avatarUrl && (
              <AvatarImage src={barber.avatarUrl} alt={barber.name} />
            )}
            <AvatarFallback>
              {barber.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="truncate font-medium">{barber.name}</span>
        </div>
      ))}
    </div>
  );
};
