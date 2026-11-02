import * as Haptics from "expo-haptics";
import { Typography, useThemeColor } from "heroui-native";
import { CaretLeftIcon, CaretRightIcon } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import {
  addMonthsBogota,
  bogotaStartOfDay,
  bogotaStartOfMonth,
  formatDayOfMonth,
  formatMonthTitle,
  formatWeekday,
  monthWeeks,
} from "@/lib/dates";

/** Row height; the 38 pt day circle sits centered in it. */
const ROW_HEIGHT = 44;
const dayNumber = { fontSize: 14, lineHeight: 18 };
const smallLabel = { fontSize: 11, lineHeight: 14 };
const titleLabel = { fontSize: 13, lineHeight: 18 };

type CalendarProps = {
  /** Bogotá midnight of the selected day. */
  value?: number;
  onChange: (dayMs: number) => void;
  /** Extra rule on top of "not before today", for example closed weekdays. */
  isDayDisabled?: (dayMs: number) => boolean;
  /** Bogotá midnights that get a dot under the number. */
  indicators?: Set<number>;
};

/**
 * Month grid, Monday first, from today onwards. Pressing a day selects it;
 * the arrows move the visible month only.
 */
export function Calendar({
  value,
  onChange,
  isDayDisabled,
  indicators,
}: CalendarProps) {
  const [todayMs] = useState(() => bogotaStartOfDay(new Date()));
  const [monthMs, setMonthMs] = useState(() =>
    bogotaStartOfMonth(value ?? todayMs),
  );
  const [accent, muted] = useThemeColor(["accent", "muted"]);

  const weeks = monthWeeks(monthMs);
  const nextMonthMs = addMonthsBogota(monthMs, 1);
  const canGoBack = monthMs > bogotaStartOfMonth(todayMs);

  const select = (dayMs: number) => {
    Haptics.selectionAsync();
    onChange(dayMs);
  };

  return (
    <View>
      <View className="h-9 flex-row items-center justify-between">
        <Typography weight="medium" style={titleLabel}>
          {formatMonthTitle(monthMs)}
        </Typography>
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            accessibilityState={{ disabled: !canGoBack }}
            disabled={!canGoBack}
            onPress={() => setMonthMs(addMonthsBogota(monthMs, -1))}
            hitSlop={8}
            className="p-1"
          >
            <CaretLeftIcon size={14} color={canGoBack ? accent : muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            onPress={() => setMonthMs(nextMonthMs)}
            hitSlop={8}
            className="p-1"
          >
            <CaretRightIcon size={14} color={accent} />
          </Pressable>
        </View>
      </View>

      <View className="flex-row py-1">
        {weeks[0].map((dayMs) => (
          <Typography
            key={dayMs}
            color="muted"
            align="center"
            className="flex-1"
            style={smallLabel}
          >
            {formatWeekday(dayMs)}
          </Typography>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0]} className="flex-row">
          {week.map((dayMs) => {
            const isOutside = dayMs < monthMs || dayMs >= nextMonthMs;
            const isDisabled =
              isOutside || dayMs < todayMs || (isDayDisabled?.(dayMs) ?? false);
            return (
              <DayCell
                key={dayMs}
                dayMs={dayMs}
                isSelected={dayMs === value}
                isToday={dayMs === todayMs}
                isDisabled={isDisabled}
                isMarked={indicators?.has(dayMs) ?? false}
                onPress={() => select(dayMs)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

type DayCellProps = {
  dayMs: number;
  isSelected: boolean;
  isToday: boolean;
  isDisabled: boolean;
  isMarked: boolean;
  onPress: () => void;
};

function DayCell({
  dayMs,
  isSelected,
  isToday,
  isDisabled,
  isMarked,
  onPress,
}: DayCellProps) {
  const circle = isSelected ? "bg-accent" : isToday ? "bg-accent-soft" : "";
  const number = isSelected
    ? "text-accent-foreground"
    : isToday
      ? "text-accent"
      : "text-foreground";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      className={`flex-1 items-center justify-center ${
        isDisabled ? "opacity-40" : ""
      }`}
      style={{ height: ROW_HEIGHT }}
    >
      <View
        className={`h-[38px] w-[38px] items-center justify-center rounded-full ${circle}`}
      >
        <Typography weight="medium" className={number} style={dayNumber}>
          {formatDayOfMonth(dayMs)}
        </Typography>
        {isMarked ? (
          <View
            className={`absolute bottom-[5px] h-[3px] w-[3px] rounded-full ${
              isSelected ? "bg-accent-foreground" : "bg-muted"
            }`}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
