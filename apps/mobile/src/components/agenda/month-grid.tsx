import { Typography } from "heroui-native";
import { Pressable, ScrollView, View } from "react-native";

import type { RangeAppointment } from "@/hooks/use-appointments";
import { firstName, timelineStatus } from "@/lib/appointments";
import {
  addMonthsBogota,
  bogotaStartOfDay,
  formatDayOfMonth,
  formatTime,
  formatWeekdayLetter,
  monthGrid,
} from "@/lib/dates";

const ROW_HEIGHT = 81;
const MAX_CHIPS = 3;
/** Room so the last row clears the floating view switcher. */
const BOTTOM_PADDING = 56;

const dayLetter = { fontSize: 11, lineHeight: 14 };
const dayNumber = { fontSize: 12, lineHeight: 14 };
const chipLabel = { fontSize: 9, lineHeight: 11 };
const tabularNums = { fontVariant: ["tabular-nums" as const] };

type MonthGridProps = {
  /** Bogotá midnight of the first day of the visible month. */
  monthMs: number;
  todayMs: number;
  selectedMs: number;
  /** Range rows of the grid; `undefined` while loading. */
  appointments: RangeAppointment[] | undefined;
  /** A tap on a day. */
  onSelectDay: (dayMs: number) => void;
  /** A tap on "+N": the day wants the day view. */
  onOpenDay: (dayMs: number) => void;
};

/**
 * Six Monday-first weeks of the visible month with up to three appointment
 * chips per day. Days outside the month fade; rows scroll under the switcher.
 */
export function MonthGrid({
  monthMs,
  todayMs,
  selectedMs,
  appointments,
  onSelectDay,
  onOpenDay,
}: MonthGridProps) {
  const days = monthGrid(monthMs);
  const nextMonthMs = addMonthsBogota(monthMs, 1);
  const byDay = new Map<number, RangeAppointment[]>();
  for (const appointment of appointments ?? []) {
    const day = bogotaStartOfDay(new Date(appointment.date));
    byDay.set(day, [...(byDay.get(day) ?? []), appointment]);
  }
  const weeks = Array.from({ length: 6 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );

  return (
    <View className="flex-1">
      <View className="h-6 flex-row items-center">
        {weeks[0].map((dayMs) => (
          <Typography
            key={dayMs}
            weight="medium"
            color="muted"
            align="center"
            className="flex-1"
            style={dayLetter}
          >
            {formatWeekdayLetter(dayMs)}
          </Typography>
        ))}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
      >
        {weeks.map((week) => (
          <View
            key={week[0]}
            className="flex-row border-separator border-t"
            style={{ height: ROW_HEIGHT }}
          >
            {week.map((dayMs) => (
              <DayCell
                key={dayMs}
                dayMs={dayMs}
                appointments={
                  byDay.get(dayMs)?.sort((a, b) => a.date - b.date) ?? []
                }
                isToday={dayMs === todayMs}
                isSelected={dayMs === selectedMs}
                isOutside={dayMs < monthMs || dayMs >= nextMonthMs}
                onPress={() => onSelectDay(dayMs)}
                onMore={() => onOpenDay(dayMs)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

type DayCellProps = {
  dayMs: number;
  appointments: RangeAppointment[];
  isToday: boolean;
  isSelected: boolean;
  isOutside: boolean;
  onPress: () => void;
  onMore: () => void;
};

function DayCell({
  dayMs,
  appointments,
  isToday,
  isSelected,
  isOutside,
  onPress,
  onMore,
}: DayCellProps) {
  const circle = isToday ? "bg-accent" : isSelected ? "bg-accent-soft" : "";
  const number = isToday
    ? "text-accent-foreground"
    : isSelected
      ? "text-accent"
      : isOutside
        ? "text-muted opacity-40"
        : "text-foreground";
  const overflow = appointments.length - MAX_CHIPS;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${formatDayOfMonth(dayMs)}, ${appointments.length} citas`}
      onPress={onPress}
      className="flex-1 items-center px-[1px] pt-[2px]"
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-full ${circle}`}
      >
        <Typography weight="medium" className={number} style={dayNumber}>
          {formatDayOfMonth(dayMs)}
        </Typography>
      </View>
      <View className="mt-[2px] w-full gap-[1px]">
        {appointments.slice(0, MAX_CHIPS).map((appointment) => {
          const paint = timelineStatus(appointment.status);
          return (
            <View
              key={appointment._id}
              className={`h-[14px] justify-center overflow-hidden rounded-[3px] px-1 ${paint.tint} ${
                paint.faded ? "opacity-50" : ""
              }`}
            >
              <Typography
                weight="medium"
                numberOfLines={1}
                style={[chipLabel, tabularNums]}
              >
                {`${formatTime(appointment.date)} ${firstName(appointment.customerName)}`}
              </Typography>
            </View>
          );
        })}
        {overflow > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${overflow} citas más`}
            onPress={onMore}
            hitSlop={4}
            className="items-center"
          >
            <Typography color="muted" style={chipLabel}>
              {`+${overflow}`}
            </Typography>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
