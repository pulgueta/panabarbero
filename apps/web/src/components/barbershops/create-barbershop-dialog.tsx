import type { Barbershop } from "@panabarbero/convex/schemas";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateBarbershopForm } from "./create-barbershop-form";

interface CreateBarbershopDialogProps {
  triggerLabel?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  userId: string | undefined;
}

export const CreateBarbershopDialog: FC<CreateBarbershopDialogProps> = ({
  triggerLabel = "Crear barbería",
  variant = "default",
  userId,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(false);

  const onSuccess = (barbershopId: Barbershop["_id"]) => {
    setOpen(false);
    navigate({
      to: "/profile/barbershops/settings",
      search: (prev) => ({ ...prev, barbershopId }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="mt-1.5">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear tu barbería</DialogTitle>
          <DialogDescription>
            Proporciona la información necesaria para registrar tu barbería.
            Podrás completar más detalles luego.
          </DialogDescription>
        </DialogHeader>

        <CreateBarbershopForm onSuccess={onSuccess} userId={userId} />
      </DialogContent>
    </Dialog>
  );
};
