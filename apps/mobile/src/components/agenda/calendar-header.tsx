import { Typography, useThemeColor } from "heroui-native";
import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "phosphor-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import {
  addMonthsBogota,
  bogotaMonth,
  bogotaYear,
  formatDayOfMonth,
  formatMonthShort,
  formatMonthTitle,
  formatWeekday,
  monthWeeks,
} from "@/lib/dates";

/** Height of one week row; the 38 pt day circle sits centered in it. */
const WEEK_ROW_HEIGHT = 49;
const PICKER_CELL_HEIGHT = 34;
const YEARS_AROUND = 10;
const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);
const expandTiming = { duration: 220, easing: Easing.out(Easing.cubic) };

const dayNumber = { fontSize: 14, lineHeight: 18 };
const smallLabel = { fontSize: 11, lineHeight: 14 };
const titleLabel = { fontSize: 13, lineHeight: 18 };

type CalendarHeaderProps = {
  todayMs: number;
  selectedMs: number;
  /** Bogotá midnight of the first day of the visible month. */
  monthMs: number;
  /** Bogotá midnights that have at least one appointment. */
  markedDays: Set<number>;
  onSelect: (dayMs: number) => void;
  onMonthChange: (monthMs: number) => void;
  onToday: () => void;
};

/**
 * Month title with a year/month picker, `‹ Hoy ›`, and a week strip that the
 * grabber below drags into the full month grid. Arrows and the picker move
 * the visible month only; tapping a day changes the selection.
 */
export function CalendarHeader({
  todayMs,
  selectedMs,
  monthMs,
  markedDays,
  onSelect,
  onMonthChange,
  onToday,
}: CalendarHeaderProps) {
  const [picker, setPicker] = useState<"closed" | "year" | "month">("closed");
  const [pickerYear, setPickerYear] = useState(() => bogotaYear(monthMs));

  const weeks = monthWeeks(monthMs);
  const nextMonthMs = addMonthsBogota(monthMs, 1);
  const selectedWeek = weeks.findIndex((week) => week.includes(selectedMs));
  // A month that does not hold the selection collapses to its first week.
  const activeWeek = selectedWeek === -1 ? 0 : selectedWeek;
  const extraRows = weeks.length - 1;

  // 0 = one week, 1 = whole month. Driven by the grabber and by day taps.
  const progress = useSharedValue(0);
  const dragStart = useSharedValue(0);
  // JS mirror of the settled `progress`, for the grabber's accessibility value.
  const [isExpanded, setIsExpanded] = useState(false);

  const setExpanded = (expanded: boolean) => {
    progress.value = withTiming(expanded ? 1 : 0, expandTiming);
    setIsExpanded(expanded);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragStart.value = progress.value;
    })
    .onUpdate((event) => {
      const next =
        dragStart.value + event.translationY / (extraRows * WEEK_ROW_HEIGHT);
      progress.value = Math.min(1, Math.max(0, next));
    })
    .onEnd((event) => {
      const target =
        event.velocityY > 250
          ? 1
          : event.velocityY < -250
            ? 0
            : progress.value > 0.5
              ? 1
              : 0;
      progress.value = withTiming(target, expandTiming);
      scheduleOnRN(setIsExpanded, target === 1);
    });
  const tap = Gesture.Tap().onEnd(() => {
    const expand = progress.value <= 0.5;
    progress.value = withTiming(expand ? 1 : 0, expandTiming);
    scheduleOnRN(setIsExpanded, expand);
  });
  const grabberGesture = Gesture.Race(pan, tap);

  const clipStyle = useAnimatedStyle(() => ({
    height: WEEK_ROW_HEIGHT + progress.value * extraRows * WEEK_ROW_HEIGHT,
  }));
  const gridStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -activeWeek * WEEK_ROW_HEIGHT * (1 - progress.value) },
    ],
  }));

  const togglePicker = () => {
    setPickerYear(bogotaYear(monthMs));
    setPicker(picker === "closed" ? "year" : "closed");
  };
  const moveMonth = (amount: number) => {
    setPicker("closed");
    onMonthChange(addMonthsBogota(monthMs, amount));
  };
  const pickMonth = (monthIndex: number) => {
    setPicker("closed");
    onMonthChange(bogotaMonth(pickerYear, monthIndex));
    setExpanded(true);
  };
  const selectDay = (dayMs: number) => {
    onSelect(dayMs);
    setExpanded(false);
  };

  const monthYear = bogotaYear(monthMs);
  const years = Array.from(
    { length: YEARS_AROUND * 2 + 1 },
    (_, index) => monthYear - YEARS_AROUND + index,
  );

  return (
    <>
      <View className="rounded-[20px] bg-agenda-card px-3 pt-1 pb-2">
        <View className="h-9 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: picker !== "closed" }}
            onPress={togglePicker}
            hitSlop={8}
            className="flex-row items-center gap-1.5 py-1"
          >
            <Typography weight="medium" style={titleLabel}>
              {formatMonthTitle(monthMs)}
            </Typography>
            <CaretIcon direction={picker === "closed" ? "right" : "down"} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
              onPress={() => moveMonth(-1)}
              hitSlop={8}
              className="p-1"
            >
              <CaretIcon direction="left" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPicker("closed");
                setExpanded(false);
                onToday();
              }}
              className="h-[30px] justify-center rounded-full border border-border px-3"
            >
              <Typography weight="medium" style={smallLabel}>
                Hoy
              </Typography>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
              onPress={() => moveMonth(1)}
              hitSlop={8}
              className="p-1"
            >
              <CaretIcon direction="right" />
            </Pressable>
          </View>
        </View>

        {picker === "year" ? (
          <PickerGrid
            items={years.map((year) => ({
              key: year,
              label: String(year),
              selected: year === monthYear,
            }))}
            onPick={(year) => {
              setPickerYear(year);
              setPicker("month");
            }}
          />
        ) : picker === "month" ? (
          <PickerGrid
            items={MONTH_INDEXES.map((monthIndex) => ({
              key: monthIndex,
              label: formatMonthShort(bogotaMonth(pickerYear, monthIndex)),
              selected: bogotaMonth(pickerYear, monthIndex) === monthMs,
            }))}
            onPick={pickMonth}
          />
        ) : (
          <>
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
            <Animated.View style={[clipStyle, { overflow: "hidden" }]}>
              <Animated.View style={gridStyle}>
                {weeks.map((week, weekIndex) => (
                  <WeekRow
                    key={week[0]}
                    isActive={weekIndex === activeWeek}
                    progress={progress}
                  >
                    {week.map((dayMs) => (
                      <DayCell
                        key={dayMs}
                        dayMs={dayMs}
                        isSelected={dayMs === selectedMs}
                        isToday={dayMs === todayMs}
                        isOutside={dayMs < monthMs || dayMs >= nextMonthMs}
                        isMarked={markedDays.has(dayMs)}
                        onPress={() => selectDay(dayMs)}
                      />
                    ))}
                  </WeekRow>
                ))}
              </Animated.View>
            </Animated.View>
          </>
        )}
      </View>

      <GestureDetector gesture={grabberGesture}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Días visibles"
          accessibilityValue={{
            text: isExpanded ? "Mes completo" : "Una semana",
          }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(event) =>
            setExpanded(event.nativeEvent.actionName === "increment")
          }
          className="h-4 items-center justify-center"
          hitSlop={10}
        >
          <View className="h-1 w-[38px] rounded-full bg-muted opacity-50" />
        </View>
      </GestureDetector>
    </>
  );
}

type WeekRowProps = {
  /** The row that stays visible while the grid is collapsed. */
  isActive: boolean;
  progress: SharedValue<number>;
  children: ReactNode;
};

/**
 * Every row owns its animated opacity. Attaching the style only to the
 * inactive rows left a stale opacity 0 behind when the active week changed.
 */
function WeekRow({ isActive, progress, children }: WeekRowProps) {
  const style = useAnimatedStyle(() => ({
    opacity: isActive ? 1 : progress.value,
  }));
  return (
    <Animated.View style={[{ flexDirection: "row" }, style]}>
      {children}
    </Animated.View>
  );
}

function CaretIcon({ direction }: { direction: "left" | "right" | "down" }) {
  const accent = useThemeColor("accent");
  const Icon =
    direction === "left"
      ? CaretLeftIcon
      : direction === "right"
        ? CaretRightIcon
        : CaretDownIcon;
  return <Icon size={14} color={accent} />;
}

type DayCellProps = {
  dayMs: number;
  isSelected: boolean;
  isToday: boolean;
  isOutside: boolean;
  isMarked: boolean;
  onPress: () => void;
};

function DayCell({
  dayMs,
  isSelected,
  isToday,
  isOutside,
  isMarked,
  onPress,
}: DayCellProps) {
  const circle = isSelected ? "bg-accent" : isToday ? "bg-accent-soft" : "";
  const number = isSelected
    ? "text-accent-foreground"
    : isToday
      ? "text-accent"
      : isOutside
        ? "text-muted opacity-40"
        : "text-foreground";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      className="flex-1 items-center justify-center"
      style={{ height: WEEK_ROW_HEIGHT }}
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

type PickerGridProps = {
  items: { key: number; label: string; selected: boolean }[];
  onPick: (key: number) => void;
};

/** Three-column pill grid shared by the year and month steps of the picker. */
function PickerGrid({ items, onPick }: PickerGridProps) {
  return (
    <View className="flex-row flex-wrap py-2">
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityState={{ selected: item.selected }}
          onPress={() => onPick(item.key)}
          className="w-1/3 px-2 py-0.5"
        >
          <View
            className={`items-center justify-center rounded-full ${
              item.selected ? "bg-accent" : ""
            }`}
            style={{ height: PICKER_CELL_HEIGHT }}
          >
            <Typography
              weight="medium"
              className={item.selected ? "text-accent-foreground" : undefined}
              style={titleLabel}
            >
              {item.label}
            </Typography>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
