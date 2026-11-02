import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { Typography } from "heroui-native";
import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  View,
} from "react-native";

import { AppointmentLink } from "@/components/agenda/appointment-link";
import {
  type DayTimelineHandle,
  FALLBACK_DURATION,
  GUTTER_WIDTH,
  HourLines,
  layoutBlocks,
  MIN_BLOCK_HEIGHT,
  NowLine,
  scrollOffsetFor,
  TIMELINE_HEIGHT,
  tabularNums,
  useNowMinutes,
} from "@/components/agenda/day-timeline";
import type { RangeAppointment } from "@/hooks/use-appointments";
import { firstName, timelineStatus } from "@/lib/appointments";
import {
  bogotaMinutesOfDay,
  bogotaStartOfDay,
  formatTime,
  formatWeekdayLetter,
} from "@/lib/dates";

/** Blocks inset from the column rules; overlapping blocks split the rest. */
const COLUMN_INSET = 2;
const OVERLAP_GAP = 2;
const HEADER_HEIGHT = 24;
const COLUMN_INDEXES = [1, 2, 3, 4, 5, 6];

const dayLetter = { fontSize: 11, lineHeight: 14 };
const blockTitle = { fontSize: 10, lineHeight: 12 };
const blockTime = { fontSize: 9, lineHeight: 11 };

type WeekTimelineProps = {
  /** Seven Bogotá midnights, Monday first. */
  days: number[];
  todayMs: number;
  selectedMs: number;
  /** Range rows of the week; `undefined` while loading. */
  appointments: RangeAppointment[] | undefined;
  selectedId: Id<"appointments"> | null;
  onSelectDay: (dayMs: number) => void;
  /** A tap on a block, before `AppointmentLink` opens the detail. */
  onSelect: (appointment: RangeAppointment) => void;
  ref?: Ref<DayTimelineHandle>;
};

/**
 * Seven day columns over the same 24-hour grid as the day view. Blocks keep
 * the status tint and bar but shrink to the customer's first name.
 */
export function WeekTimeline({
  days,
  todayMs,
  selectedMs,
  appointments,
  selectedId,
  onSelectDay,
  onSelect,
  ref,
}: WeekTimelineProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const nowMinutes = useNowMinutes();
  const hasToday = days.includes(todayMs);

  const scrollToMinutes = (minutes: number, animated: boolean) => {
    scrollRef.current?.scrollTo({
      y: scrollOffsetFor(minutes, viewport.height),
      animated,
    });
  };
  const scrollToNow = (animated: boolean) =>
    scrollToMinutes(nowMinutes, animated);
  useImperativeHandle(ref, () => ({ scrollToNow }));

  // Same opening rule as the day view, once per week: now, or the first block.
  const scrolledWeek = useRef<number | null>(null);
  useEffect(() => {
    if (viewport.height === 0 || scrolledWeek.current === days[0]) return;
    if (hasToday) {
      scrolledWeek.current = days[0];
      scrollToNow(false);
      return;
    }
    if (!appointments) return;
    scrolledWeek.current = days[0];
    const first = Math.min(...appointments.map((a) => a.date));
    if (Number.isFinite(first))
      scrollToMinutes(bogotaMinutesOfDay(first), true);
  });

  const columnWidth = (viewport.width - GUTTER_WIDTH) / 7;
  const areaWidth = columnWidth - COLUMN_INSET * 2;
  const byDay = new Map<number, RangeAppointment[]>();
  for (const appointment of appointments ?? []) {
    const day = bogotaStartOfDay(new Date(appointment.date));
    byDay.set(day, [...(byDay.get(day) ?? []), appointment]);
  }

  return (
    <View className="flex-1">
      <View
        className="flex-row border-separator border-b"
        style={{ height: HEADER_HEIGHT, paddingLeft: GUTTER_WIDTH }}
      >
        {days.map((dayMs) => {
          const isToday = dayMs === todayMs;
          const isSelected = dayMs === selectedMs;
          return (
            <Pressable
              key={dayMs}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectDay(dayMs)}
              className="flex-1 items-center justify-center"
            >
              <Typography
                weight={isSelected || isToday ? "semibold" : "medium"}
                className={
                  isToday
                    ? "text-accent"
                    : isSelected
                      ? "text-foreground"
                      : "text-muted"
                }
                style={dayLetter}
              >
                {formatWeekdayLetter(dayMs)}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        onLayout={(event) => setViewport(event.nativeEvent.layout)}
        contentContainerStyle={{ height: TIMELINE_HEIGHT }}
        showsVerticalScrollIndicator={false}
      >
        <HourLines nowMinutes={hasToday ? nowMinutes : undefined} />
        {columnWidth > 0
          ? COLUMN_INDEXES.map((index) => (
              <View
                key={index}
                className="absolute top-0 bottom-0 w-px bg-separator"
                style={{ left: GUTTER_WIDTH + index * columnWidth }}
              />
            ))
          : null}

        {days.map((dayMs, dayIndex) =>
          layoutBlocks(byDay.get(dayMs) ?? [], areaWidth).map(
            ({ appointment, top, height, column, columns }) => {
              const width = (areaWidth - (columns - 1) * OVERLAP_GAP) / columns;
              return (
                <AppointmentLink
                  key={appointment._id}
                  appointment={appointment}
                  onPress={() => onSelect(appointment)}
                >
                  <WeekBlock
                    appointment={appointment}
                    isSelected={appointment._id === selectedId}
                    style={{
                      top,
                      height,
                      left:
                        GUTTER_WIDTH +
                        dayIndex * columnWidth +
                        COLUMN_INSET +
                        column * (width + OVERLAP_GAP),
                      width,
                    }}
                  />
                </AppointmentLink>
              );
            },
          ),
        )}

        {hasToday ? <NowLine nowMinutes={nowMinutes} /> : null}
      </ScrollView>
    </View>
  );
}

type WeekBlockProps = {
  appointment: RangeAppointment;
  isSelected: boolean;
  style: { top: number; height: number; left: number; width: number };
  /** Injected by `AppointmentLink`. */
  onPress?: () => void;
  onLongPress?: () => void;
};

function WeekBlock({
  appointment,
  isSelected,
  style,
  onPress,
  onLongPress,
}: WeekBlockProps) {
  const paint = timelineStatus(appointment.status);
  const minutes =
    appointment.items?.reduce((total, item) => total + item.duration, 0) ||
    FALLBACK_DURATION;
  const endMs = appointment.date + minutes * 60 * 1000;
  const start = formatTime(appointment.date);
  // Under 28 pt there is room for the name only.
  const showTime = style.height >= MIN_BLOCK_HEIGHT;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${appointment.customerName}, ${start} – ${formatTime(endMs)}`}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      onLongPress={onLongPress}
      className={`absolute overflow-hidden rounded-[4px] border ${paint.tint} ${
        isSelected ? "border-accent" : "border-transparent"
      } ${paint.faded ? "opacity-50" : ""}`}
      style={style}
    >
      <View className={`absolute top-0 bottom-0 left-0 w-[3px] ${paint.bar}`} />
      <View className="flex-1 pt-[2px] pr-1 pl-[6px]">
        <Typography weight="medium" numberOfLines={1} style={blockTitle}>
          {firstName(appointment.customerName)}
        </Typography>
        {showTime ? (
          <Typography
            color="muted"
            numberOfLines={1}
            style={[blockTime, tabularNums]}
          >
            {start}
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
}
