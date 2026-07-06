import type {
  BarbershopMember,
  BarbershopMemberWithName,
} from "@convex/schema";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CALENDAR_VIEWS } from "./constants";
import { getRangeTitle } from "./helpers";
import type { CalendarView } from "./types";

type BarberFilter = BarbershopMember["_id"] | "all";

interface CalendarHeaderProps {
  view: CalendarView;
  date: Date;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  barbers: BarbershopMemberWithName[];
  barberFilter: BarberFilter;
  onBarberFilterChange: (value: BarberFilter) => void;
  showBarberFilter: boolean;
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
};

export const CalendarHeader: FC<CalendarHeaderProps> = ({
  view,
  date,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  barbers,
  barberFilter,
  onBarberFilterChange,
  showBarberFilter,
}) => (
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onToday}>
        Hoy
      </Button>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrev}
          aria-label="Periodo anterior"
        >
          <CaretLeftIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          aria-label="Periodo siguiente"
        >
          <CaretRightIcon />
        </Button>
      </div>
      <h2 className="min-w-0 truncate font-medium text-sm capitalize sm:text-base">
        {getRangeTitle(view, date)}
      </h2>
    </div>

    <div className="flex items-center gap-2">
      {showBarberFilter ? (
        <Select
          value={barberFilter === "all" ? undefined : barberFilter}
          onValueChange={(value) =>
            onBarberFilterChange((value as BarberFilter | null) ?? "all")
          }
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Todos">
              {(value) =>
                barbers.find((barber) => barber._id === value)?.name ?? "Todos"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los barberos</SelectItem>
            {barbers.map((barber) => (
              <SelectItem key={barber._id} value={barber._id}>
                {barber.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {/* biome-ignore lint/a11y/useSemanticElements: segmented control uses button group styling */}
      <div
        role="group"
        aria-label="Cambiar vista"
        className="inline-flex rounded-lg border border-border p-0.5"
      >
        {CALENDAR_VIEWS.map((item) => {
          const active = item === view;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => onViewChange(item)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {VIEW_LABELS[item]}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
