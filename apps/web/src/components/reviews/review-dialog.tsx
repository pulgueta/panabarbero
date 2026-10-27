import type { Id } from "@convex/_generated/dataModel";
import type { FC, ReactElement } from "react";
import { useState } from "react";

import { ReviewForm } from "@/components/reviews/review-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ReviewDialogProps {
  appointmentId: Id<"appointments">;
  serviceName?: string;
  trigger: ReactElement;
  onSuccess?: () => void;
}

export const ReviewDialog: FC<ReviewDialogProps> = ({
  appointmentId,
  serviceName,
  trigger,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deja tu reseña</DialogTitle>
          <DialogDescription>
            Cuéntale a otros clientes cómo te fue. Tu reseña es opcional.
          </DialogDescription>
        </DialogHeader>

        <ReviewForm
          appointmentId={appointmentId}
          serviceName={serviceName}
          onSuccess={() => {
            setOpen(false);
            onSuccess?.();
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
