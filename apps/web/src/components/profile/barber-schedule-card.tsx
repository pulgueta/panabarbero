import type { BarbershopMember } from "@convex/schema";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBarberByUserId,
  useBarberSchedule,
} from "@/hooks/use-barbershop-members";

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

const ScheduleContent: FC<{ memberId: BarbershopMember["_id"] }> = ({
  memberId,
}) => {
  const { data: scheduleData, isLoading } = useBarberSchedule(memberId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DAYS.map((d) => (
          <Skeleton key={d.key} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  const schedule = scheduleData?.schedule ?? [];
  const isCustom = scheduleData?.isCustom ?? false;

  return (
    <div className="flex flex-col gap-3">
      {isCustom && (
        <p className="text-muted-foreground text-xs">
          Tienes un horario personalizado diferente al de la barbería.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {DAYS.map(({ key, label }) => {
          const entry = schedule.find((s) => s.weekDay.day === key);
          const isActive = entry?.weekDay.isActive ?? false;

          return (
            <div
              key={key}
              className={`flex flex-col gap-1 text-pretty rounded-lg border p-4 transition-opacity ${!isActive ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{label}</span>
                <Badge variant={isActive ? "success" : "outline"}>
                  {isActive ? "Activo" : "Cerrado"}
                </Badge>
              </div>

              {isActive && entry && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {entry.openAt} – {entry.closeAt}
                  </span>
                  {entry.lunchStart && entry.lunchEnd && (
                    <span className="text-muted-foreground">
                      No disponible: {entry.lunchStart} – {entry.lunchEnd}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface BarberScheduleCardProps {
  userId: string;
  hideHeader?: boolean;
}

export const BarberScheduleCard: FC<BarberScheduleCardProps> = ({
  userId,
  hideHeader = false,
}) => {
  const { data: member } = useBarberByUserId(userId);

  if (!member) return null;

  return (
    <Card className="w-full">
      {!hideHeader && (
        <CardHeader>
          <CardTitle>Mi horario</CardTitle>
          <CardDescription>
            Tu horario de trabajo semanal. Contacta al dueño para solicitar
            cambios.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <ScheduleContent memberId={member._id} />
      </CardContent>
    </Card>
  );
};
