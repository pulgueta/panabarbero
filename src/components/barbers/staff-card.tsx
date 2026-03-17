import type { BarbershopMemberWithName } from "@convex/schema";
import type { FC } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopMemberActions } from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface StaffCardProps {
  member: BarbershopMemberWithName;
  isOwner: boolean;
}

export const StaffCard: FC<StaffCardProps> = ({ member, isOwner }) => {
  const [removeOpen, setRemoveOpen] = useState(false);
  const haptic = useWebHaptics();

  const {
    removeStaffMutation: {
      mutateAsync: removeStaff,
      isPending: isRemovingStaff,
    },
  } = useBarbershopMemberActions();

  const handleRemoveStaff = async () => {
    try {
      await removeStaff({ id: member._id });
      haptic.trigger("success");
      toast.success(`${member.name} fue eliminado del equipo`);
      setRemoveOpen(false);
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

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
        <CardDescription className="mt-1">
          <Badge variant="secondary">Recepcionista</Badge>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-muted-foreground text-sm">
          Puede gestionar citas, servicios e invitar barberos.
        </p>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        {isOwner && (
          <>
            <Button
              variant="destructive"
              onClick={() => setRemoveOpen(true)}
              disabled={isRemovingStaff}
            >
              {isRemovingStaff && <Spinner />}
              Eliminar
            </Button>

            <ResponsiveModal open={removeOpen} onOpenChange={setRemoveOpen}>
              <ResponsiveModalContent>
                <ResponsiveModalHeader>
                  <ResponsiveModalTitle>
                    Eliminar a {member.name}
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    Esta acción removerá a este recepcionista de tu barbería y
                    perderá el acceso al panel de gestión.
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <ResponsiveModalFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRemoveOpen(false)}
                    disabled={isRemovingStaff}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveStaff}
                    disabled={isRemovingStaff}
                  >
                    {isRemovingStaff && <Spinner />}
                    Sí, eliminar
                  </Button>
                </ResponsiveModalFooter>
              </ResponsiveModalContent>
            </ResponsiveModal>
          </>
        )}
      </CardFooter>
    </Card>
  );
};
