import type { Barbershop, BarbershopMember, Service } from "@convex/schema";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { useAvailableSlots } from "@/hooks/use-appointments";
import { cn } from "@/lib/utils";

interface TimeSlotPickerProps {
  barbershopId: Barbershop["_id"];
  barbershopMemberId: BarbershopMember["_id"];
  serviceId: Service["_id"];
  /** Midnight-normalized timestamp of the selected date. */
  date: number;
  /** Currently selected slot time string (e.g. "09:00"). */
  value?: string;
  /** Whether a transition is pending (date/barber/service change in progress). */
  isPending?: boolean;
  onChange: (slotTime: string, slotMinutes: number) => void;
}

export const TimeSlotPicker: FC<TimeSlotPickerProps> = ({
  barbershopId,
  barbershopMemberId,
  serviceId,
  date,
  value,
  isPending,
  onChange,
}) => {
  const { data: slots } = useAvailableSlots({
    barbershopId,
    barbershopMemberId,
    serviceId,
    date,
  });

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 transition-opacity duration-150 md:grid-cols-4",
        isPending && "pointer-events-none opacity-50",
      )}
      aria-busy={isPending}
    >
      {slots.length > 0 ? (
        slots.map((slot) => (
          <Button
            key={slot.time}
            type="button"
            variant={value === slot.time ? "default" : "outline"}
            size="sm"
            className={cn(
              "tabular-nums",
              value === slot.time && "font-semibold",
            )}
            onClick={() => onChange(slot.time, slot.minutes)}
          >
            {slot.time}
          </Button>
        ))
      ) : (
        <p className="col-span-full text-muted-foreground text-sm">
          No hay horarios disponibles para esta fecha.
        </p>
      )}
    </div>
  );
};
