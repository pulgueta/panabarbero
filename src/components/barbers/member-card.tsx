/** biome-ignore-all lint/style/noNonNullAssertion: for now */
import type { BarbershopMemberWithName, Service } from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useServicesForBarber } from "@/hooks/use-barbershop-members";
import { RemoveMemberDialog } from "./remove-member-dialog";

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  barber: "Barbero",
  staff: "Recepcionista",
};

/** Renders the assigned-services list for a barber member. */
const BarberServices: FC<{ memberId: BarbershopMemberWithName["_id"] }> = ({
  memberId,
}) => {
  const { data: barberServices, isLoading } = useServicesForBarber(memberId);

  if (isLoading) return <Skeleton className="h-4 w-full" />;

  if (!barberServices || barberServices.length === 0) {
    return (
      <p className="text-muted-foreground text-xs italic">
        Sin servicios asignados
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {barberServices.slice(0, 3).map((service) => (
        <Badge key={service?._id} variant="outline">
          {service?.name}
        </Badge>
      ))}
      {barberServices.length > 3 && (
        <Badge variant="outline">+{barberServices.length - 3} más</Badge>
      )}
    </div>
  );
};

interface MemberCardProps {
  member: BarbershopMemberWithName;
  /** All barbershop services — only needed for barber members (service management). */
  services?: Service[];
  isOwner: boolean;
}

export const MemberCard: FC<MemberCardProps> = ({
  member,
  services,
  isOwner,
}) => {
  const isBarber = member.roles.includes("barber");
  const isMemberOwner = member.roles.includes("owner");

  const { data: barberServices } = useServicesForBarber(
    isBarber ? member._id : (undefined as unknown as typeof member._id),
  );

  const canRemove = isOwner && !isMemberOwner;
  const canManageServices = isOwner && isBarber && barberServices;
  const canManageSchedule = isOwner && isBarber;
  const removeVariant = isBarber ? "barber" : "staff";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Avatar>
            <AvatarImage src={member.avatarUrl} />
            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {member.name}
        </CardTitle>
        <div className="mt-1 flex flex-wrap gap-1">
          {member.roles.map((role) => (
            <Badge
              key={role}
              variant={role === "owner" ? "default" : "secondary"}
            >
              {ROLE_LABELS[role] ?? role}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isBarber ? (
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-sm">
              Servicios asignados:
            </p>
            <BarberServices memberId={member._id} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Puede gestionar citas, servicios e invitar barberos.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex-wrap justify-end gap-2">
        {canManageSchedule && (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                to="/profile/barbershops/team/barbers/$memberId/schedule"
                params={{ memberId: member._id }}
              />
            }
          >
            Horario
          </Button>
        )}

        {canManageServices && services && (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                to="/profile/barbershops/team/barbers/$memberId/services"
                params={{ memberId: member._id }}
              />
            }
          >
            Gestionar servicios
          </Button>
        )}

        {canRemove && (
          <RemoveMemberDialog
            member={member}
            variant={removeVariant as "barber" | "staff"}
          />
        )}
      </CardFooter>
    </Card>
  );
};
