import type { api } from "@panabarbero/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Typography } from "heroui-native";
import { View } from "react-native";

import { ListGroup, ListRow } from "@/components/ui/list-group";

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

const hoursStyle = { fontSize: 14, lineHeight: 18 };
const lunchStyle = { fontSize: 12, lineHeight: 16 };
const tabularNums = { fontVariant: ["tabular-nums" as const] };

/** Read-only weekly schedule, Monday to Sunday, one row per day. */
export function BarberScheduleList({ schedule, isCustom }: BarberSchedule) {
  return (
    <ListGroup
      label="Mi horario"
      footer={
        isCustom ? "Horario personalizado." : "Usa el horario de la barbería."
      }
    >
      {WEEK_DAYS.map(({ key, label }) => {
        const entry = schedule.find((s) => s.weekDay.day === key);
        const isActive = entry?.weekDay.isActive ?? false;

        return (
          <ListRow
            key={key}
            title={label}
            muted={!isActive}
            trailing={
              entry && isActive ? (
                <View className="items-end">
                  <Typography style={[hoursStyle, tabularNums]}>
                    {entry.openAt}–{entry.closeAt}
                  </Typography>
                  {entry.lunchStart && entry.lunchEnd ? (
                    <Typography color="muted" style={[lunchStyle, tabularNums]}>
                      Almuerzo {entry.lunchStart}–{entry.lunchEnd}
                    </Typography>
                  ) : null}
                </View>
              ) : (
                <Typography color="muted" style={hoursStyle}>
                  Cerrado
                </Typography>
              )
            }
          />
        );
      })}
    </ListGroup>
  );
}
