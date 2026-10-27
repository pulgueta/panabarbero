import type { api } from "@panabarbero/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Typography } from "heroui-native";
import { View } from "react-native";

export type BarberSchedule = NonNullable<
  FunctionReturnType<typeof api.barbershopMembers.getBarberSchedule>
>;

const WEEK_DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

/** Read-only weekly schedule, Monday to Sunday. */
export function BarberScheduleList({ schedule, isCustom }: BarberSchedule) {
  return (
    <View className="gap-3">
      <View className="gap-2">
        {WEEK_DAYS.map(({ key, label }) => {
          const entry = schedule.find((s) => s.weekDay.day === key);
          const isActive = entry?.weekDay.isActive ?? false;

          return (
            <View
              key={key}
              className="flex-row items-start justify-between gap-4"
            >
              <Typography type="body-sm" color={isActive ? "default" : "muted"}>
                {label}
              </Typography>
              {entry && isActive ? (
                <View className="items-end">
                  <Typography type="body-sm" className="tabular-nums">
                    {entry.openAt}–{entry.closeAt}
                  </Typography>
                  {entry.lunchStart && entry.lunchEnd ? (
                    <Typography
                      type="body-xs"
                      color="muted"
                      className="tabular-nums"
                    >
                      Almuerzo {entry.lunchStart}–{entry.lunchEnd}
                    </Typography>
                  ) : null}
                </View>
              ) : (
                <Typography type="body-sm" color="muted">
                  Cerrado
                </Typography>
              )}
            </View>
          );
        })}
      </View>
      <Typography type="body-xs" color="muted">
        {isCustom ? "Horario personalizado" : "Usa el horario de la barbería"}
      </Typography>
    </View>
  );
}
