import { Typography } from "heroui-native";
import type { Ref } from "react";
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  View,
} from "react-native";

import { formatDayOfMonth, formatWeekday } from "@/lib/dates";

/** Pill width plus the gap after it, used to scroll a day into view. */
export const DAY_PILL_STRIDE = 56;
export const DAY_STRIP_PADDING = 20;

type DayStripProps = {
  days: number[];
  todayMs: number;
  selectedMs: number;
  onSelect: (dayMs: number) => void;
  onLayout?: () => void;
  ref?: Ref<ScrollViewInstance>;
};

export function DayStrip({
  days,
  todayMs,
  selectedMs,
  onSelect,
  onLayout,
  ref,
}: DayStripProps) {
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={onLayout}
      contentContainerStyle={{ paddingHorizontal: DAY_STRIP_PADDING }}
    >
      <View className="flex-row gap-2">
        {days.map((dayMs) => {
          const isSelected = dayMs === selectedMs;
          const isToday = dayMs === todayMs;

          return (
            <Pressable
              key={dayMs}
              onPress={() => onSelect(dayMs)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              className={`w-12 items-center gap-0.5 rounded-lg border py-2 ${
                isSelected ? "border-accent bg-accent" : "border-border"
              }`}
            >
              <Typography
                className={`text-xs ${
                  isSelected ? "text-accent-foreground" : "text-muted"
                }`}
              >
                {formatWeekday(dayMs)}
              </Typography>
              <Typography
                weight="semibold"
                className={
                  isSelected
                    ? "text-accent-foreground"
                    : isToday
                      ? "text-accent"
                      : "text-foreground"
                }
              >
                {formatDayOfMonth(dayMs)}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
