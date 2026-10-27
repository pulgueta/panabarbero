import type { Appointment, AppointmentItem } from "@convex/schema";
import type { FC, ReactElement, SubmitEvent } from "react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { cn, formatCurrency } from "@/lib/utils";

interface MarkAppointmentDialogProps {
  trigger: ReactElement;
  appointment: Appointment;
}

export const MarkAppointmentDialog: FC<MarkAppointmentDialogProps> = ({
  trigger,
  appointment,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<"completed" | "no-show">("completed");
  const [finalPrices, setFinalPrices] = useState<Record<string, string>>({});
  const formId = useId();
  const formIds = {
    completed: useId(),
    noShow: useId(),
  };
  const haptic = useWebHaptics();

  const {
    setStatusMutation: { mutateAsync: setAppointmentStatus },
  } = useAppointmentActions();

  // "Starting" lines need their agreed final price to complete; legacy rows
  // (no items) never carry starting lines, so the dialog stays as-is for them.
  const startingLines = (appointment.items ?? []).filter(
    (line) => line.priceType === "starting" && line.finalPrice === undefined,
  );

  const requiresFinalPrices =
    status === "completed" && startingLines.length > 0;

  const isLineValid = (line: AppointmentItem) => {
    const value = Number(finalPrices[line.serviceId]);

    return Number.isFinite(value) && value >= line.price;
  };

  const submitDisabled =
    requiresFinalPrices && !startingLines.every(isLineValid);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setStatus("completed");
      setFinalPrices(
        Object.fromEntries(
          startingLines.map((line) => [line.serviceId, String(line.price)]),
        ),
      );
    }
    setOpen(nextOpen);
  };

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setOpen(false);

      await setAppointmentStatus({
        appointment: { id: appointment._id },
        status,
        finalPrices: requiresFinalPrices
          ? startingLines.map((line) => ({
              serviceId: line.serviceId,
              finalPrice: Number(finalPrices[line.serviceId]),
            }))
          : undefined,
      });

      haptic.trigger("success");
      toast.success("Cita marcada correctamente.");
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent className="pb-4">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Marcar cita</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Asigna el estado final de la cita.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <form id={formId} className="flex flex-col gap-4" onSubmit={onSubmit}>
          <RadioGroup
            value={status}
            onValueChange={(value) =>
              setStatus(value as "completed" | "no-show")
            }
            name="status"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="completed" id={formIds.completed} />
              <Label htmlFor={formIds.completed}>Completada</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="no-show" id={formIds.noShow} />
              <Label htmlFor={formIds.noShow}>No asistió</Label>
            </div>
          </RadioGroup>

          {requiresFinalPrices && (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                Registra el precio final acordado para los servicios con precio
                "desde".
              </p>
              {startingLines.map((line) => {
                const invalid = !isLineValid(line);
                const inputId = `${formId}-${line.serviceId}`;

                return (
                  <Field key={line.serviceId} data-invalid={invalid}>
                    <Label htmlFor={inputId}>{line.name}</Label>
                    <Input
                      id={inputId}
                      type="number"
                      inputMode="numeric"
                      min={line.price}
                      value={finalPrices[line.serviceId] ?? ""}
                      onChange={(e) =>
                        setFinalPrices((prev) => ({
                          ...prev,
                          [line.serviceId]: e.target.value,
                        }))
                      }
                      aria-invalid={invalid}
                      className="tabular-nums"
                    />
                    <p
                      className={cn(
                        "text-xs",
                        invalid ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      Mínimo {formatCurrency(line.price)}.
                    </p>
                  </Field>
                );
              })}
            </div>
          )}
        </form>

        <ResponsiveModalFooter>
          <Field>
            <Button type="submit" form={formId} disabled={submitDisabled}>
              Marcar
            </Button>
          </Field>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
