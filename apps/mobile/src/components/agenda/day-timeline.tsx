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
  type Appointment,
  timelineStatus,
  totalDuration,
} from "@/lib/appointments";
import { bogotaMinutesOfDay, formatHour, formatTime } from "@/lib/dates";

export const HOUR_HEIGHT = 56;
/** Hour labels sit in the gutter; the vertical rule and the blocks start after it. */
export const GUTTER_WIDTH = 52;
const BLOCK_GAP = 4;
export const MIN_BLOCK_HEIGHT = 28;
export const FALLBACK_DURATION = 30;
export const TOP_PADDING = 16;
/** Room so the last hour clears the floating view switcher. */
export const BOTTOM_PADDING = 72;
/** Full scroll height of a 24-hour timeline. */
export const TIMELINE_HEIGHT = TOP_PADDING + 24 * HOUR_HEIGHT + BOTTOM_PADDING;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const hourLabel = { fontSize: 9, lineHeight: 11 };
const nowLabel = { fontSize: 8, lineHeight: 10 };
const blockTitle = { fontSize: 11, lineHeight: 13 };
const blockDetail = { fontSize: 9, lineHeight: 11 };
export const tabularNums = { fontVariant: ["tabular-nums" as const] };

export function minutesToY(minutes: number) {
  return TOP_PADDING + (minutes / 60) * HOUR_HEIGHT;
}

/** Half the hour label: headroom so the top visible label is never cut. */
const LABEL_HEADROOM = 6;
/** An hour label this close to the now line hides under its pill. */
const NOW_LABEL_CLEARANCE = 10;

/**
 * Scroll offset that shows `minutes` in the top third of the viewport,
 * snapped up to the hour line above it with room for that hour's label.
 */
export function scrollOffsetFor(minutes: number, viewportHeight: number) {
  const target = minutesToY(minutes) - viewportHeight / 3;
  const hourLine =
    Math.floor((target - TOP_PADDING) / HOUR_HEIGHT) * HOUR_HEIGHT +
    TOP_PADDING;
  return Math.max(0, hourLine - LABEL_HEADROOM);
}

export type DayTimelineHandle = {
  /** Scroll so the current time sits in the top third of the viewport. */
  scrollToNow: (animated: boolean) => void;
};

type DayTimelineProps = {
  /** Bogotá midnight of the shown day; a change scrolls to its first appointment. */
  dayMs: number;
  /** `undefined` while loading. */
  appointments: Appointment[] | undefined;
  /** The now line and pill show only on today. */
  isToday: boolean;
  selectedId: Id<"appointments"> | null;
  /** Set for owner and staff; barbers see only their own appointments. */
  memberName?: (memberId: Id<"barbershopMembers">) => string;
  /** A tap, before `AppointmentLink` opens the detail. */
  onSelect: (appointment: Appointment) => void;
  ref?: Ref<DayTimelineHandle>;
};

/** One day as a 24-hour grid with the appointments laid out as tinted blocks. */
export function DayTimeline({
  dayMs,
  appointments,
  isToday,
  selectedId,
  memberName,
  onSelect,
  ref,
}: DayTimelineProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const nowMinutes = useNowMinutes();

  // Puts `minutes` in the top third of the viewport.
  const scrollToMinutes = (minutes: number, animated: boolean) => {
    scrollRef.current?.scrollTo({
      y: scrollOffsetFor(minutes, viewport.height),
      animated,
    });
  };
  const scrollToNow = (animated: boolean) =>
    scrollToMinutes(nowMinutes, animated);
  useImperativeHandle(ref, () => ({ scrollToNow }));

  // Open at "now"; a new day opens at its first appointment once it has loaded.
  // Each day scrolls once, so live updates never move the user.
  const scrolledDay = useRef<number | null>(null);
  useEffect(() => {
    if (viewport.height === 0 || scrolledDay.current === dayMs) return;
    if (isToday) {
      scrolledDay.current = dayMs;
      scrollToNow(false);
      return;
    }
    if (!appointments) return;
    scrolledDay.current = dayMs;
    const first = Math.min(...appointments.map((a) => a.date));
    if (Number.isFinite(first))
      scrollToMinutes(bogotaMinutesOfDay(first), true);
  });

  const blocks = layoutBlocks(
    appointments ?? [],
    viewport.width - GUTTER_WIDTH - BLOCK_GAP * 2,
  );

  return (
    <View className="flex-1">
      <ScrollView
        ref={scrollRef}
        onLayout={(event) => setViewport(event.nativeEvent.layout)}
        contentContainerStyle={{ height: TIMELINE_HEIGHT }}
        showsVerticalScrollIndicator={false}
      >
        <HourLines nowMinutes={isToday ? nowMinutes : undefined} />

        {blocks.map(({ appointment, top, height, column, columns }) => {
          const columnWidth =
            (viewport.width -
              GUTTER_WIDTH -
              BLOCK_GAP * 2 -
              (columns - 1) * BLOCK_GAP) /
            columns;
          const detail = detailText(
            appointment,
            memberName?.(appointment.barbershopMemberId),
          );
          const isSelected = appointment._id === selectedId;
          return (
            <AppointmentLink
              key={appointment._id}
              appointment={appointment}
              onPress={() => onSelect(appointment)}
              accessibilityLabel={`${appointment.customerName}, ${detail}`}
              accessibilityState={{ selected: isSelected }}
              style={{
                top,
                height,
                left:
                  GUTTER_WIDTH + BLOCK_GAP + column * (columnWidth + BLOCK_GAP),
                width: columnWidth,
              }}
            >
              <TimelineBlock
                appointment={appointment}
                detail={detail}
                height={height}
                isSelected={isSelected}
              />
            </AppointmentLink>
          );
        })}

        {isToday ? <NowLine nowMinutes={nowMinutes} /> : null}
      </ScrollView>

      {appointments?.length === 0 ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <Typography.Paragraph type="body-sm" color="muted">
            Sin citas este día.
          </Typography.Paragraph>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The gutter rule and the 24 hour lines with their labels, absolutely placed.
 * Pass `nowMinutes` on today so the label under the now pill steps aside.
 */
export function HourLines({ nowMinutes }: { nowMinutes?: number }) {
  const isUnderNowPill = (hour: number) =>
    nowMinutes !== undefined &&
    Math.abs(minutesToY(hour * 60) - minutesToY(nowMinutes)) <
      NOW_LABEL_CLEARANCE;
  return (
    <>
      <View
        className="absolute top-0 bottom-0 w-px bg-separator"
        style={{ left: GUTTER_WIDTH }}
      />
      {HOURS.map((hour) => {
        const y = minutesToY(hour * 60);
        return (
          <View key={hour} className="absolute inset-x-0" style={{ top: y }}>
            <View
              className="h-px bg-separator"
              style={{ marginLeft: GUTTER_WIDTH }}
            />
            {hour > 0 && !isUnderNowPill(hour) ? (
              <Typography
                weight="medium"
                color="muted"
                align="end"
                className="absolute"
                style={[
                  hourLabel,
                  tabularNums,
                  { top: -5, left: 0, width: GUTTER_WIDTH - 6 },
                ]}
              >
                {formatHour(hour)}
              </Typography>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

/** Red time pill in the gutter and a line across the columns at the current minute. */
export function NowLine({ nowMinutes }: { nowMinutes: number }) {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0"
      style={{ top: minutesToY(nowMinutes) }}
    >
      <View className="h-px bg-danger" style={{ marginLeft: GUTTER_WIDTH }} />
      <View
        className="absolute h-1.5 w-0.5 bg-danger"
        style={{ left: GUTTER_WIDTH, top: -3 }}
      />
      <View
        className="absolute h-3.5 w-[46px] items-center justify-center rounded-full bg-danger"
        style={{ left: 2, top: -7 }}
      >
        <Typography
          weight="bold"
          className="text-danger-foreground"
          style={[nowLabel, tabularNums]}
        >
          {formatTime(Date.now())}
        </Typography>
      </View>
    </View>
  );
}

/** "10:00 – 10:30", with " · Daniela" for owner and staff. */
function detailText(appointment: Appointment, barberName?: string) {
  const endMs =
    appointment.date +
    (totalDuration(appointment) ?? FALLBACK_DURATION) * 60 * 1000;
  const range = `${formatTime(appointment.date)} – ${formatTime(endMs)}`;
  return barberName ? `${range} · ${barberName}` : range;
}

type TimelineBlockProps = {
  appointment: Appointment;
  detail: string;
  /** Drawn height, from the layout; the block fills its `AppointmentLink` frame. */
  height: number;
  isSelected: boolean;
  /** Injected by `AppointmentLink`. */
  onPress?: () => void;
  onLongPress?: () => void;
};

function TimelineBlock({
  appointment,
  detail,
  height,
  isSelected,
  onPress,
  onLongPress,
}: TimelineBlockProps) {
  const paint = timelineStatus(appointment.status);
  // A 30-minute block (28 pt) still fits both lines; anything shorter keeps the name only.
  const showDetail = height >= MIN_BLOCK_HEIGHT;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${appointment.customerName}, ${detail}`}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      onLongPress={onLongPress}
      className={`flex-1 overflow-hidden rounded-[6px] border ${paint.tint} ${
        isSelected ? "border-accent" : "border-transparent"
      } ${paint.faded ? "opacity-50" : ""}`}
    >
      <View className={`absolute top-0 bottom-0 left-0 w-[3px] ${paint.bar}`} />
      <View
        className="flex-1 pr-2 pl-[11px]"
        style={{ paddingTop: showDetail ? 2 : 3 }}
      >
        <Typography weight="medium" numberOfLines={1} style={blockTitle}>
          {appointment.customerName}
        </Typography>
        {showDetail ? (
          <Typography
            color="muted"
            numberOfLines={1}
            style={[blockDetail, tabularNums]}
          >
            {detail}
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
}

/** What the layout needs from a row: full documents and range rows both fit. */
type TimelineItem = { date: number; items?: { duration: number }[] };

type PlacedBlock<T extends TimelineItem> = {
  appointment: T;
  top: number;
  height: number;
  column: number;
  columns: number;
};

/**
 * Positions each appointment by its start and duration, then splits
 * overlapping runs into side-by-side columns. Overlap uses the drawn height,
 * so very short appointments never draw on top of each other.
 */
export function layoutBlocks<T extends TimelineItem>(
  appointments: T[],
  areaWidth: number,
) {
  if (areaWidth <= 0) return [];

  const sorted = [...appointments].sort((a, b) => a.date - b.date);
  const placed: PlacedBlock<T>[] = [];
  let cluster: PlacedBlock<T>[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const block of cluster) block.columns = columnEnds.length;
    placed.push(...cluster);
    cluster = [];
    columnEnds = [];
  };

  for (const appointment of sorted) {
    const minutes = totalDuration(appointment) ?? FALLBACK_DURATION;
    const top = minutesToY(bogotaMinutesOfDay(appointment.date)) + 1;
    const height = Math.max(MIN_BLOCK_HEIGHT, (minutes / 60) * HOUR_HEIGHT - 2);
    const bottom = top + height;

    if (top >= clusterEnd) flush();

    let column = columnEnds.findIndex((end) => end <= top);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(bottom);
    } else {
      columnEnds[column] = bottom;
    }
    cluster.push({ appointment, top, height, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, bottom);
  }
  flush();

  return placed;
}

/** Minutes since Bogotá midnight, refreshed on every minute boundary. */
export function useNowMinutes() {
  const [minutes, setMinutes] = useState(() => bogotaMinutesOfDay(Date.now()));

  useEffect(() => {
    // One timer at a time, re-armed for the next boundary after each tick.
    let timeout: ReturnType<typeof setTimeout>;
    const arm = () => {
      timeout = setTimeout(
        () => {
          setMinutes(bogotaMinutesOfDay(Date.now()));
          arm();
        },
        60 * 1000 - (Date.now() % (60 * 1000)),
      );
    };
    arm();
    return () => clearTimeout(timeout);
  }, []);

  return minutes;
}
