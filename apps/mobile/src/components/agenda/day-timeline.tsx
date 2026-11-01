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

import {
  type Appointment,
  timelineStatus,
  totalDuration,
} from "@/lib/appointments";
import { bogotaMinutesOfDay, formatHour, formatTime } from "@/lib/dates";

const HOUR_HEIGHT = 56;
/** Hour labels sit in the gutter; the vertical rule and the blocks start after it. */
const GUTTER_WIDTH = 52;
const BLOCK_GAP = 4;
const MIN_BLOCK_HEIGHT = 28;
const FALLBACK_DURATION = 30;
const TOP_PADDING = 16;
/** Room so the last hour clears the floating view switcher. */
const BOTTOM_PADDING = 72;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const hourLabel = { fontSize: 9, lineHeight: 11 };
const nowLabel = { fontSize: 8, lineHeight: 10 };
const blockTitle = { fontSize: 11, lineHeight: 13 };
const blockDetail = { fontSize: 9, lineHeight: 11 };
const tabularNums = { fontVariant: ["tabular-nums" as const] };

function minutesToY(minutes: number) {
  return TOP_PADDING + (minutes / 60) * HOUR_HEIGHT;
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
  onOpen: (appointment: Appointment) => void;
  ref?: Ref<DayTimelineHandle>;
};

/** One day as a 24-hour grid with the appointments laid out as tinted blocks. */
export function DayTimeline({
  dayMs,
  appointments,
  isToday,
  selectedId,
  memberName,
  onOpen,
  ref,
}: DayTimelineProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const nowMinutes = useNowMinutes();

  // Puts `minutes` in the top third of the viewport.
  const scrollToMinutes = (minutes: number, animated: boolean) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, minutesToY(minutes) - viewport.height / 3),
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
  const nowY = minutesToY(nowMinutes);

  return (
    <View className="flex-1">
      <ScrollView
        ref={scrollRef}
        onLayout={(event) => setViewport(event.nativeEvent.layout)}
        contentContainerStyle={{
          height: TOP_PADDING + 24 * HOUR_HEIGHT + BOTTOM_PADDING,
        }}
        showsVerticalScrollIndicator={false}
      >
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
              {hour > 0 ? (
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

        {blocks.map(({ appointment, top, height, column, columns }) => {
          const columnWidth =
            (viewport.width -
              GUTTER_WIDTH -
              BLOCK_GAP * 2 -
              (columns - 1) * BLOCK_GAP) /
            columns;
          return (
            <TimelineBlock
              key={appointment._id}
              appointment={appointment}
              barberName={memberName?.(appointment.barbershopMemberId)}
              isSelected={appointment._id === selectedId}
              style={{
                top,
                height,
                left:
                  GUTTER_WIDTH + BLOCK_GAP + column * (columnWidth + BLOCK_GAP),
                width: columnWidth,
              }}
              onPress={() => onOpen(appointment)}
            />
          );
        })}

        {isToday ? (
          <View
            pointerEvents="none"
            className="absolute inset-x-0"
            style={{ top: nowY }}
          >
            <View
              className="h-px bg-danger"
              style={{ marginLeft: GUTTER_WIDTH }}
            />
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
        ) : null}
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

type TimelineBlockProps = {
  appointment: Appointment;
  barberName?: string;
  isSelected: boolean;
  style: { top: number; height: number; left: number; width: number };
  onPress: () => void;
};

function TimelineBlock({
  appointment,
  barberName,
  isSelected,
  style,
  onPress,
}: TimelineBlockProps) {
  const paint = timelineStatus(appointment.status);
  const endMs =
    appointment.date +
    (totalDuration(appointment) ?? FALLBACK_DURATION) * 60 * 1000;
  const range = `${formatTime(appointment.date)} – ${formatTime(endMs)}`;
  const detail = barberName ? `${range} · ${barberName}` : range;
  // A 30-minute block (28 pt) still fits both lines; anything shorter keeps the name only.
  const showDetail = style.height >= MIN_BLOCK_HEIGHT;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${appointment.customerName}, ${detail}`}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      className={`absolute overflow-hidden rounded-[6px] border ${paint.tint} ${
        isSelected ? "border-accent" : "border-transparent"
      } ${paint.faded ? "opacity-50" : ""}`}
      style={style}
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

type PlacedBlock = {
  appointment: Appointment;
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
function layoutBlocks(appointments: Appointment[], areaWidth: number) {
  if (areaWidth <= 0) return [];

  const sorted = [...appointments].sort((a, b) => a.date - b.date);
  const placed: PlacedBlock[] = [];
  let cluster: PlacedBlock[] = [];
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
function useNowMinutes() {
  const [minutes, setMinutes] = useState(() => bogotaMinutesOfDay(Date.now()));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setMinutes(bogotaMinutesOfDay(Date.now()));
    const timeout = setTimeout(
      () => {
        tick();
        interval = setInterval(tick, 60 * 1000);
      },
      60 * 1000 - (Date.now() % (60 * 1000)),
    );
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return minutes;
}
