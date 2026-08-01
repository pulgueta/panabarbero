/** biome-ignore-all lint: Vendored ReUI registry component. */
"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { PlusIcon } from "@phosphor-icons/react";
import { addDays, format, getWeek } from "date-fns";
import {
  type CSSProperties,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarViewContext,
  useCalendar,
  useCalendarDay,
  useCalendarSelector,
  useCalendarSettings,
  useCalendarViewConfig,
  useCalendarViewSettings,
  useCalendarWeek,
} from "@/components/calendar/calendar";
import {
  CALENDAR_GHOST,
  CalendarChip,
} from "@/components/calendar/calendar-chip";
import {
  useCalendarGestures,
  wasRecentChipPress,
  wasRecentDrag,
} from "@/components/calendar/calendar-dnd";
import {
  getDayKey,
  getRangeKey,
  resolveOffDay,
  toZoned,
  zonedStartOfDay,
} from "@/components/calendar/calendar-lib";
import type {
  CalendarDateRange,
  CalendarDragState,
  CalendarEventId,
  CalendarSegment,
} from "@/components/calendar/calendar-types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Layout-effect on the client (measure before paint, no flash), plain effect on
// the server (never runs there) to avoid the SSR useLayoutEffect warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
const MONTH_VIEW_CONTEXT = { view: "month" } as const;

// An occurrence key encodes the start instant and is also the chip's React key,
// so committing a move re-keys the chip: React remounts it and the browser
// drops focus to <body>. The chip that owns focus is recorded here so the cell
// rendering its replacement can hand focus back. Module scope because the drop
// can land in a different cell than the one the chip left, and only one element
// holds focus at a time anyway.
let focusedChip: {
  node: HTMLElement;
  eventId: CalendarEventId;
  recurrenceIndex?: number;
} | null = null;

/** Give focus back to the recorded chip's replacement, if `root` renders it. */
function restoreChipFocus(
  root: HTMLElement | null,
  segments: CalendarSegment[],
) {
  const pending = focusedChip;
  // Only a chip removed WHILE focused needs help: a node still in the tree, or
  // a focus that has already moved on by itself, is left alone.
  if (!root || !pending || pending.node.isConnected) return;
  const active = document.activeElement;
  if (active && active !== document.body) return;
  const index = segments.findIndex(
    (segment) =>
      segment.occurrence.eventId === pending.eventId &&
      segment.occurrence.recurrenceIndex === pending.recurrenceIndex,
  );
  if (index < 0) return;
  const chip = root.querySelectorAll<HTMLElement>("[data-slot=calendar-chip]")[
    index
  ];
  if (!chip) return;
  // cleared first: focus() re-records through the new chip's own onFocus
  focusedChip = null;
  chip.focus();
}

function segmentCoversDay(
  segment: CalendarSegment,
  dayOffset: number,
): boolean {
  return (
    (segment.colStart ?? 0) <= dayOffset &&
    dayOffset < (segment.colStart ?? 0) + (segment.colSpan ?? 1)
  );
}

interface CalendarMonthViewProps extends useRender.ComponentProps<"div"> {
  maxEventsPerCell?: number | "auto";
}

function CalendarMonthView({
  className,
  render,
  maxEventsPerCell,
  ...props
}: CalendarMonthViewProps) {
  const instance = useCalendar();
  const settings = useCalendarSettings();
  const viewConfig = useCalendarViewConfig();
  const visibleRange = useCalendarSelector<unknown, CalendarDateRange>(
    (state) => state.visibleRange,
    {
      isEqual: (a, b) => getRangeKey(a) === getRangeKey(b),
    },
  );
  const anchorDate = useCalendarSelector((state) => state.date);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  const { effective } = useCalendarViewSettings();
  const weeks = useMemo(() => {
    const days: Date[] = [];
    let cursor = zonedStartOfDay(visibleRange.start, settings.timeZone);
    while (cursor < visibleRange.end) {
      days.push(cursor);
      cursor = zonedStartOfDay(
        addDays(toZoned(cursor, settings.timeZone), 1),
        settings.timeZone,
      );
    }
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    if (effective.weekends) return rows;
    return rows.map((row) =>
      row.filter(
        (day) =>
          !settings.weekendDays.includes(
            toZoned(day, settings.timeZone).getDay(),
          ),
      ),
    );
  }, [
    visibleRange,
    settings.timeZone,
    settings.weekendDays,
    effective.weekends,
  ]);

  const headerDays = weeks[0] ?? [];
  const title = settings.i18n.functions.formatTitle("month", {
    date: toZoned(anchorDate, settings.timeZone),
    activeRange: instance.api.getActiveRange(),
    visibleRange,
    locale: settings.locale,
  });

  const gridTemplateColumns = `${effective.weekNumbers ? "var(--cal-week-number-w, 2.75rem) " : ""}repeat(${headerDays.length}, minmax(0, 1fr))`;
  const cap = maxEventsPerCell ?? viewConfig.maxEventsPerCell;
  const contained = viewConfig.scrollMode !== "page";

  // "auto" fits as many event rows as the cell height allows and rolls the rest
  // into "+N more". Only the contained mode gives a cell a bounded height to
  // measure; page mode grows to fit, so "auto" there keeps the fixed fallback.
  const autoFit = cap === "auto" && contained;
  // slotProbe resolves the event-row height (--cal-month-bar-h) to px, honoring
  // the current font size and any consumer override; contentProbe is the first
  // cell's flex-1 content area, whose height is the event space per cell.
  const slotProbeRef = useRef<HTMLDivElement | null>(null);
  const contentProbeRef = useRef<HTMLDivElement | null>(null);
  const [autoCap, setAutoCap] = useState<number | null>(null);
  const measureCap = useCallback(() => {
    const content = contentProbeRef.current;
    const slot = slotProbeRef.current;
    if (!content || !slot) return;
    const laneH = slot.getBoundingClientRect().height;
    if (laneH <= 0) return;
    const cs = getComputedStyle(content);
    const inner = content.clientHeight - (parseFloat(cs.paddingTop) || 0);
    const gap = parseFloat(cs.rowGap) || 0;
    // N rows occupy N*laneH - gap (the last row has no trailing gap)
    setAutoCap(Math.max(1, Math.floor((inner + gap) / laneH)));
  }, []);
  useIsoLayoutEffect(() => {
    if (!autoFit) {
      setAutoCap(null);
      return;
    }
    const content = contentProbeRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    measureCap();
    const observer = new ResizeObserver(measureCap);
    observer.observe(content);
    return () => observer.disconnect();
    // re-observe the first cell after a re-layout (row count or month change)
  }, [autoFit, measureCap, weeks.length, anchorDate]);
  const resolvedCap = cap === "auto" ? (autoFit ? (autoCap ?? 3) : 3) : cap;

  const defaultProps = {
    "data-slot": "calendar-month-view",
    "data-view": "month",
    role: "grid",
    "aria-label": title,
    className: cn(
      "flex flex-col border-t",
      contained && "min-h-0 flex-1 overflow-hidden",
      viewConfig.classNames?.monthView,
      className,
    ),
    children: (
      <>
        <div
          role="row"
          data-slot="calendar-month-header"
          // @container scopes the narrow-label breakpoint to the header row
          className={cn(
            "@container grid border-b",
            viewConfig.classNames?.monthHeader,
          )}
          style={{ gridTemplateColumns }}
        >
          {effective.weekNumbers && (
            <div
              role="columnheader"
              aria-hidden
              className={cn(
                "border-e px-2 py-1.5",
                viewConfig.classNames?.weekNumber,
              )}
            />
          )}
          {headerDays.map((day) => (
            <div
              key={day.getTime()}
              role="columnheader"
              className={cn(
                "text-muted-foreground truncate px-2 py-1.5 font-medium",
                viewConfig.classNames?.monthDayHeader,
              )}
            >
              {viewConfig.renderDayHeader?.({
                day,
                view: "month",
                isToday:
                  today !== null &&
                  getDayKey(day, settings.timeZone) ===
                    getDayKey(today, settings.timeZone),
              }) ?? (
                <>
                  <span className="@max-[36rem]:hidden">
                    {format(
                      toZoned(day, settings.timeZone),
                      settings.i18n.formats.monthDayHeader,
                      { locale: settings.locale },
                    )}
                  </span>
                  <span className="hidden @max-[36rem]:inline">
                    {format(
                      toZoned(day, settings.timeZone),
                      settings.i18n.formats.monthDayHeaderNarrow,
                      { locale: settings.locale },
                    )}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
        <div
          data-slot="calendar-month-body"
          className={cn(
            "grid",
            contained && "min-h-0 flex-1",
            viewConfig.classNames?.monthBody,
          )}
          style={{
            gridTemplateRows: contained
              ? `repeat(${weeks.length}, minmax(0, 1fr))`
              : `repeat(${weeks.length}, minmax(var(--cal-month-row-min-h, 8rem), auto))`,
          }}
        >
          {weeks.map((week, rowIndex) => (
            <CalendarMonthWeek
              key={rowIndex}
              week={week}
              gridTemplateColumns={gridTemplateColumns}
              showWeekNumber={effective.weekNumbers}
              cap={resolvedCap}
              autoFit={autoFit}
              contentRef={rowIndex === 0 ? contentProbeRef : undefined}
            />
          ))}
        </div>
        {autoFit && (
          <div
            ref={slotProbeRef}
            aria-hidden
            className="pointer-events-none invisible absolute h-[var(--cal-month-bar-h,1.75rem)] w-0"
          />
        )}
      </>
    ),
  };

  return (
    <CalendarViewContext.Provider value={MONTH_VIEW_CONTEXT}>
      {useRender({
        defaultTagName: "div",
        render,
        props: mergeProps<"div">(defaultProps, props),
      })}
    </CalendarViewContext.Provider>
  );
}

/**
 * One month week row. Multi-day / all-day events render as CONTINUOUS bars in
 * an overlay grid that spans day columns (colStart -> colSpan) and stacks by
 * lane; single-day timed events render inside each cell below the reserved bar
 * lanes. This is what makes a cross-day event read as one whole block instead
 * of a chip repeated per cell.
 */
function CalendarMonthWeek({
  week,
  gridTemplateColumns,
  showWeekNumber,
  cap,
  autoFit,
  contentRef,
}: {
  week: Date[];
  gridTemplateColumns: string;
  showWeekNumber: boolean;
  cap: number;
  autoFit: boolean;
  /** Set on the first week only: forwarded to its first cell's content area so
   *  the view can measure the per-cell event height for "auto". */
  contentRef?: Ref<HTMLDivElement>;
}) {
  const settings = useCalendarSettings();
  const viewConfig = useCalendarViewConfig();
  const { bars, rowStart } = useCalendarWeek(week[0]);
  const colOffset = showWeekNumber ? 1 : 0;
  const dayMs = 86400000;
  const rowStartMs = zonedStartOfDay(
    rowStart ?? week[0],
    settings.timeZone,
  ).getTime();
  // Day offsets from the TRUE row start (0-6) for each visible column, so a
  // weekends-hidden month still places bars on the right days.
  const offsets = week.map((d) =>
    Math.round(
      (zonedStartOfDay(d, settings.timeZone).getTime() - rowStartMs) / dayMs,
    ),
  );
  /** Clamp a day-offset span onto the visible columns; null = fully hidden. */
  const gridPos = (colStart: number, colSpan: number) => {
    let start = -1;
    let end = -1;
    for (let o = colStart; o < colStart + colSpan; o++) {
      const col = offsets.indexOf(o);
      if (col === -1) continue;
      if (start === -1) start = col;
      end = col;
    }
    return start === -1 ? null : { col: start, span: end - start + 1 };
  };
  // bars fit within the cap; deeper lanes fall into each day's "+N more"
  const visibleBars = bars.filter((b) => (b.lane ?? 0) < cap);
  // Occurrence keys of the bars hidden in each column (lane >= cap). Threaded to
  // the cell so its "+N more" popover can list the hidden bars WITHOUT re-listing
  // the visible ones (day buckets carry no lane, so the week row - which owns bar
  // laning - is the only place that knows which bars are hidden).
  const hiddenBarKeysByCol = week.map(
    (_, col) =>
      new Set(
        bars
          .filter(
            (b) => (b.lane ?? 0) >= cap && segmentCoversDay(b, offsets[col]),
          )
          .map((b) => b.occurrence.key),
      ),
  );

  // Live move/resize ghost at the PROPOSED day span. Standardized treatment
  // (CALENDAR_GHOST): move = the event carried as a full clone, resize =
  // the same clone with a dashed boundary; invalid adds destructive marking
  // while the engine shows the not-allowed cursor + validation hint.
  const dragGhost = useCalendarSelector<
    unknown,
    | (Pick<
        CalendarDragState,
        | "kind"
        | "valid"
        | "occurrence"
        | "proposedStart"
        | "proposedEnd"
        | "proposedAllDay"
      > & {
        colStart: number;
        colSpan: number;
        isStart: boolean;
        isEnd: boolean;
        color?: string;
      })
    | null
  >(
    (state) => {
      const drag = state.drag;
      if (!drag) return null;
      const rowEndMs = rowStartMs + 7 * dayMs;
      const startDayMs = zonedStartOfDay(
        drag.proposedStart,
        settings.timeZone,
      ).getTime();
      // exclusive end -> the last covered day
      const lastDayMs = zonedStartOfDay(
        new Date(drag.proposedEnd.getTime() - 1),
        settings.timeZone,
      ).getTime();
      if (startDayMs >= rowEndMs || lastDayMs < rowStartMs) return null;
      const startCol = Math.max(
        0,
        Math.round((startDayMs - rowStartMs) / dayMs),
      );
      const endCol = Math.min(6, Math.round((lastDayMs - rowStartMs) / dayMs));
      if (endCol < startCol) return null;
      return {
        kind: drag.kind,
        valid: drag.valid,
        occurrence: drag.occurrence,
        proposedStart: drag.proposedStart,
        proposedEnd: drag.proposedEnd,
        proposedAllDay: drag.proposedAllDay,
        colStart: startCol,
        colSpan: endCol - startCol + 1,
        isStart: startDayMs >= rowStartMs,
        isEnd: lastDayMs < rowEndMs,
        color: drag.occurrence.event.color,
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.colStart === b.colStart &&
          a.colSpan === b.colSpan &&
          a.valid === b.valid &&
          a.kind === b.kind &&
          a.proposedAllDay === b.proposedAllDay &&
          a.proposedStart.getTime() === b.proposedStart.getTime() &&
          a.proposedEnd.getTime() === b.proposedEnd.getTime()),
    },
  );
  const ghostPos = dragGhost
    ? gridPos(dragGhost.colStart, dragGhost.colSpan)
    : null;
  const ghostLane = dragGhost
    ? (bars.find((b) => b.occurrence.key === dragGhost.occurrence.key)?.lane ??
      0)
    : 0;
  // A single-day timed MOVE is indicated INLINE in the target cell (a
  // placeholder at the time-sorted position, rendered by CalendarMonthCell)
  // rather than as a bar in this overlay, so only bar drags and every resize
  // render the overlay ghost. Bars = all-day or multi-day (span > 1 day).
  const ghostIsBar =
    !!dragGhost &&
    (dragGhost.kind !== "move" ||
      dragGhost.proposedAllDay ||
      dragGhost.proposedEnd.getTime() - dragGhost.proposedStart.getTime() >
        dayMs);

  return (
    <div
      role="row"
      data-slot="calendar-month-row"
      className={cn(
        "relative grid min-h-0 border-b last:border-b-0",
        viewConfig.classNames?.monthRow,
      )}
      style={{ gridTemplateColumns }}
    >
      {showWeekNumber && (
        <div
          role="rowheader"
          data-slot="calendar-week-number"
          className={cn(
            "text-muted-foreground border-e px-2 pt-1 tabular-nums",
            viewConfig.classNames?.weekNumber,
          )}
        >
          {settings.i18n.labels.week(
            getWeek(toZoned(week[0], settings.timeZone), {
              // locale supplies firstWeekContainsDate, so a de/ISO calendar
              // numbers the year-boundary weeks its own way instead of falling
              // back to US numbering; weekStartsOn stays explicit so the number
              // keeps matching the rendered grid
              locale: settings.locale,
              weekStartsOn: settings.weekStartsOn,
            }),
          )}
        </div>
      )}
      {week.map((day, col) => (
        <CalendarMonthCell
          key={day.getTime()}
          day={day}
          cap={cap}
          // Reserve lane space only for bars that pass through THIS cell, so a
          // short multi-day event does not push down timed events in unrelated
          // cells of the same row. Reserve down to the deepest covering bar
          // lane so timed events always sit below every bar in their own cell.
          reservedLanes={visibleBars.reduce(
            (max, b) =>
              segmentCoversDay(b, offsets[col])
                ? Math.max(max, (b.lane ?? 0) + 1)
                : max,
            0,
          )}
          hiddenBarKeys={hiddenBarKeysByCol[col]}
          isLast={col === week.length - 1}
          autoFit={autoFit}
          contentRef={col === 0 ? contentRef : undefined}
        />
      ))}
      {/* Continuous bar overlay: one element per bar, placed by grid-column so
          a cross-day span is a single unbroken block. pointer-events pass
          through the gaps to the cells below. NOT aria-hidden - these are the
          real interactive bars. */}
      {(visibleBars.length > 0 || (dragGhost && ghostPos && ghostIsBar)) && (
        <div
          data-slot="calendar-month-bar-overlay"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 grid pt-1.5",
            viewConfig.classNames?.monthBarOverlay,
          )}
          style={{
            gridTemplateColumns,
            gridAutoRows: "var(--cal-month-bar-h, 1.75rem)",
          }}
        >
          {visibleBars.map((bar) => {
            const pos = gridPos(bar.colStart ?? 0, bar.colSpan ?? 1);
            if (!pos) return null;
            return (
              <div
                key={bar.occurrence.key}
                className={cn(
                  "pointer-events-auto min-w-0 px-1",
                  viewConfig.classNames?.monthBar,
                )}
                style={{
                  gridColumn: `${colOffset + pos.col + 1} / span ${pos.span}`,
                  gridRow: (bar.lane ?? 0) + 1,
                }}
              >
                {/* lane height minus the 2px inter-lane gap */}
                <CalendarChip
                  segment={bar}
                  className="h-[calc(var(--cal-month-bar-h,1.75rem)-0.125rem)]"
                />
              </div>
            );
          })}
          {dragGhost && ghostPos && ghostIsBar && (
            <div
              aria-hidden
              className={cn("min-w-0 px-1", viewConfig.classNames?.monthBar)}
              style={{
                gridColumn: `${colOffset + ghostPos.col + 1} / span ${ghostPos.span}`,
                gridRow: ghostLane + 1,
              }}
            >
              <div
                data-slot="calendar-drag-ghost"
                data-kind={dragGhost.kind}
                data-drop-invalid={!dragGhost.valid || undefined}
                className={cn(
                  "h-[calc(var(--cal-month-bar-h,1.75rem)-0.125rem)]",
                  dragGhost.kind === "move"
                    ? // faint drop placeholder only: the cursor-attached
                      // carry clone owns the visual during moves
                      cn(
                        CALENDAR_GHOST.move,
                        !dragGhost.valid && CALENDAR_GHOST.invalid,
                      )
                    : cn(
                        CALENDAR_GHOST.resize,
                        !dragGhost.valid && CALENDAR_GHOST.invalidResize,
                      ),
                  viewConfig.classNames?.dragGhost,
                )}
                style={
                  {
                    "--cal-event-color":
                      dragGhost.color ?? "var(--color-primary)",
                  } as CSSProperties
                }
              >
                {dragGhost.kind !== "move" && (
                  <CalendarChip
                    preview
                    segment={{
                      occurrence: {
                        ...dragGhost.occurrence,
                        start: dragGhost.proposedStart,
                        end: dragGhost.proposedEnd,
                      },
                      day: week[ghostPos.col] ?? week[0],
                      isStart: dragGhost.isStart,
                      isEnd: dragGhost.isEnd,
                      continuesBefore: !dragGhost.isStart,
                      continuesAfter: !dragGhost.isEnd,
                    }}
                    className={cn(
                      "h-full inset-ring-0",
                      !dragGhost.valid && CALENDAR_GHOST.invalidContent,
                    )}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarMonthCell({
  day,
  cap,
  reservedLanes,
  hiddenBarKeys,
  isLast,
  autoFit,
  contentRef,
}: {
  day: Date;
  cap: number;
  reservedLanes: number;
  /** Occurrence keys of the bars hidden in THIS column (lane >= cap), from the
   *  week row. Lets the cell list hidden bars in its overflow popover without
   *  re-listing the bars already visible in the row overlay. */
  hiddenBarKeys: Set<string>;
  /** Last column in the row - drops the right border so the grid's outer edge
   *  is owned by the container, not a doubled cell border. Passed explicitly
   *  because the bar overlay renders after the cells, so `:last-child` is
   *  unreliable on rows that have bars. */
  isLast: boolean;
  /** When true, the "+N more" chip is treated as taking a row so the visible
   *  chips + indicator always fit the measured cell height. */
  autoFit: boolean;
  /** Set on the first cell only: measured to derive the "auto" cap. */
  contentRef?: Ref<HTMLDivElement>;
}) {
  const settings = useCalendarSettings();
  const viewConfig = useCalendarViewConfig();
  const gestures = useCalendarGestures();
  const { segments, isToday, isOutside } = useCalendarDay(day);

  const dayStart = zonedStartOfDay(day, settings.timeZone);
  const dayEnd = addDays(toZoned(dayStart, settings.timeZone), 1);
  const { effective } = useCalendarViewSettings();
  const isOff = resolveOffDay(
    day,
    settings.timeZone,
    effective.offDays
      ? typeof viewConfig.offDays === "object"
        ? viewConfig.offDays
        : true
      : false,
    settings.weekendDays,
  );
  const offClassName =
    (typeof viewConfig.offDays === "object" && viewConfig.offDays.className) ||
    "bg-muted/25";

  const isDropTarget = useCalendarSelector<unknown, "valid" | "invalid" | null>(
    (state) => {
      const drag = state.drag;
      if (!drag) return null;
      const covered =
        drag.proposedStart < dayEnd && drag.proposedEnd > dayStart;
      if (!covered) return null;
      return drag.valid ? "valid" : "invalid";
    },
  );
  // Hide hover affordances mid-gesture: the only intent is the drop target.
  // Gated on the one thing that reads it: a plain global boolean flips for all
  // 42 cells the moment a gesture starts and again when it ends, which is pure
  // waste in the default configuration where no add button renders.
  const isInteracting = useCalendarSelector<unknown, boolean>((state) =>
    viewConfig.showDayAddButton
      ? state.drag !== null || state.slotDraft !== null
      : false,
  );
  const inDraft = useCalendarSelector<
    unknown,
    { isStart: boolean; isEnd: boolean } | null
  >(
    (state) => {
      const draft = state.slotDraft;
      if (!draft || !draft.allDay) return null;
      if (draft.start >= dayEnd || draft.end <= dayStart) return null;
      return {
        isStart: draft.start >= dayStart,
        isEnd: draft.end <= dayEnd,
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.isStart === b.isStart &&
          a.isEnd === b.isEnd),
    },
  );
  // A single-day timed MOVE landing on THIS day: expose the proposed
  // minute-of-day (+ color/validity) so the cell can render a drop placeholder
  // at the correct time-sorted position, instead of the overlay marking a bar
  // over the first chip. Skipped for bars (they keep the overlay ghost) and for
  // a no-op move back onto the event's own day (the dimmed source already marks
  // the spot).
  const inlineDrop = useCalendarSelector<
    unknown,
    { min: number; valid: boolean; color?: string } | null
  >(
    (state) => {
      const drag = state.drag;
      if (!drag || drag.kind !== "move" || drag.proposedAllDay) return null;
      if (drag.proposedEnd.getTime() - drag.proposedStart.getTime() > 86400000)
        return null;
      const dropDayMs = zonedStartOfDay(
        drag.proposedStart,
        settings.timeZone,
      ).getTime();
      if (dropDayMs !== dayStart.getTime()) return null;
      if (
        zonedStartOfDay(drag.occurrence.start, settings.timeZone).getTime() ===
        dayStart.getTime()
      )
        return null;
      return {
        min: (drag.proposedStart.getTime() - dropDayMs) / 60000,
        valid: drag.valid,
        color: drag.occurrence.event.color,
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.min === b.min &&
          a.valid === b.valid &&
          a.color === b.color),
    },
  );

  // Bars (allDay/multi-day) are drawn by the week-row overlay; the cell renders
  // only single-day timed events, below the reserved bar lanes.
  const extraHidden = hiddenBarKeys.size;
  const hiddenBarSegs = segments.allDay.filter((s) =>
    hiddenBarKeys.has(s.occurrence.key),
  );
  const m = segments.timed.length;
  const timedSlots = Math.max(0, cap - reservedLanes);

  // Static (at-rest) split: what the cell shows with no drag, and - crucially -
  // what the "+N more" popover lists. The popover carries ONLY the hidden events
  // (hidden bars + timed past the cap), never the chips already visible in the
  // cell, so it never duplicates them. autoFit gives up one timed row to the
  // "+N more" indicator so the visible chips fit the clipped cell height.
  const staticOverflow = extraHidden > 0 || m > timedSlots;
  const staticShown =
    autoFit && staticOverflow ? Math.max(0, timedSlots - 1) : timedSlots;
  const overflowSegments = [
    ...hiddenBarSegs,
    ...segments.timed.slice(staticShown),
  ];

  // Live split: while a timed chip is dragged onto this day, render the day
  // exactly as it will look AFTER the drop. The dragged chip is a phantom in the
  // time-sorted order and is shown as the placeholder - inline where it lands,
  // or ON the "+N more" indicator when it lands in the overflow bucket (so the
  // user sees the drop will push it into "more"). The "+N more" count always
  // reflects the post-drop hidden total.
  let visibleTimed: CalendarSegment[];
  let overflowCount: number;
  let placeholderIndex: number;
  let placeholderAtMore: boolean;
  if (!inlineDrop) {
    visibleTimed = segments.timed.slice(0, staticShown);
    overflowCount = overflowSegments.length;
    placeholderIndex = -1;
    placeholderAtMore = false;
  } else {
    // rank of the dragged chip in the resulting time-sorted list (chips are
    // time-ordered, so this is the count starting at or before its time)
    const insertRank = segments.timed.filter(
      (s) => (s.startMin ?? 0) <= inlineDrop.min,
    ).length;
    const dropOverflow = extraHidden > 0 || m + 1 > timedSlots;
    // rows for timed items INCLUDING the phantom, before the "+N more" row
    const vis = !dropOverflow
      ? m + 1
      : autoFit
        ? Math.max(0, timedSlots - 1)
        : timedSlots;
    placeholderAtMore = insertRank >= vis;
    visibleTimed = placeholderAtMore
      ? segments.timed.slice(0, vis)
      : segments.timed.slice(0, Math.max(0, vis - 1));
    placeholderIndex = placeholderAtMore ? -1 : insertRank;
    overflowCount =
      extraHidden + (m - visibleTimed.length) + (placeholderAtMore ? 1 : 0);
  }

  // No dep array: the replacement for a chip that lost focus to a commit can
  // appear on any re-render of any cell, and a cell with nothing to restore
  // bails after two comparisons.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useIsoLayoutEffect(() => {
    restoreChipFocus(rootRef.current, visibleTimed);
  });

  // Faint dashed drop placeholder, tinted to the dragged event's color, echoing
  // the move ghost (CALENDAR_GHOST.move); one chip-height tall so chips
  // shift by exactly one row when it is inserted.
  const dropPlaceholder = inlineDrop ? (
    <div
      key="cal-drop-placeholder"
      aria-hidden
      data-slot="calendar-drop-placeholder"
      data-drop-invalid={!inlineDrop.valid || undefined}
      className={cn(
        "shrink-0 rounded-sm border border-dashed",
        inlineDrop.valid
          ? "border-(--cal-event-color)/50 bg-(--cal-event-color)/8"
          : "border-destructive/70 bg-destructive/10",
        viewConfig.classNames?.dragGhost,
      )}
      style={
        {
          "--cal-event-color": inlineDrop.color ?? "var(--color-primary)",
          height: "calc(var(--cal-month-bar-h, 1.75rem) - 0.125rem)",
        } as CSSProperties
      }
    />
  ) : null;

  const defaultContent = (
    <>
      <div
        ref={contentRef}
        className={cn(
          // gap-0.5 pairs with the 0.125rem subtraction in the lane spacer
          // below; changing the gap requires renderMonthCell
          // px-1 matches the all-day bar wrapper inset so single-day chips and
          // multi-day bars line up on the same left/right edge in a cell
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-1 pt-1.5",
          viewConfig.classNames?.monthCellContent,
        )}
      >
        {reservedLanes > 0 && (
          <div
            aria-hidden
            className="shrink-0"
            style={{
              // lane height already carries the 2px inter-lane gap; subtract
              // it so spacer + the column's own gap-0.5 = the SAME 2px rhythm
              // between the last bar and the first timed chip
              height: `calc(${reservedLanes} * var(--cal-month-bar-h, 1.75rem) - 0.125rem)`,
            }}
          />
        )}
        {visibleTimed.flatMap((segment, i) => {
          const chip = (
            <CalendarChip
              key={segment.occurrence.key}
              segment={segment}
              // Remember the chip holding focus so a commit that re-keys it can
              // hand focus back to the remounted one (see restoreChipFocus)
              onFocus={(e) => {
                focusedChip = {
                  node: e.currentTarget,
                  eventId: segment.occurrence.eventId,
                  recurrenceIndex: segment.occurrence.recurrenceIndex,
                };
              }}
              // A chip still in the tree lost focus on its own, so there is
              // nothing to restore; only a blur from the remount is kept.
              onBlur={(e) => {
                if (e.currentTarget.isConnected) focusedChip = null;
              }}
              // Hold a fixed height like the all-day lane above; without this
              // the chip flex-shrinks to whatever room the cell has left, so
              // cells with a reserved bar lane or a second chip render shorter
              // chips.
              className="shrink-0"
            />
          );
          return i === placeholderIndex ? [dropPlaceholder, chip] : [chip];
        })}
        {placeholderIndex >= 0 &&
          placeholderIndex >= visibleTimed.length &&
          dropPlaceholder}
        {overflowCount > 0 && (
          <CalendarMoreIndicator
            day={day}
            count={overflowCount}
            segments={overflowSegments}
            dropInto={
              placeholderAtMore && inlineDrop
                ? { color: inlineDrop.color, valid: inlineDrop.valid }
                : undefined
            }
          />
        )}
      </div>
      {/* Day number + add affordance, bottom-right (Notion-style) */}
      <div
        className={cn(
          "flex items-center justify-end gap-1 px-2 pb-1.5",
          viewConfig.classNames?.monthCellFooter,
        )}
      >
        {viewConfig.showDayAddButton && !isInteracting && (
          <button
            type="button"
            data-slot="calendar-day-add"
            aria-label={settings.i18n.labels.addEvent}
            // a different icon/markup is a renderMonthCell job
            className={cn(
              "bg-primary text-primary-foreground flex size-5 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity group-hover/cal-cell:opacity-100 focus-visible:opacity-100",
              viewConfig.classNames?.dayAddButton,
            )}
            onClick={(e) => {
              e.stopPropagation();
              settings.onSlotClick?.(
                { date: day, allDay: true, view: "month" },
                e,
              );
            }}
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
          </button>
        )}
        <span
          data-slot="calendar-month-day-number"
          className={cn(
            "flex size-5 items-center justify-center rounded-full",
            isOutside && "text-muted-foreground",
            // the filled circle already marks today; keep the number the same
            // weight/size as the other days so it does not read as larger
            // Same font-size as every other day; a lighter weight cancels the
            // way white digits on the filled circle read bolder/larger than the
            // dark-on-light numbers around them.
            isToday && "bg-primary text-primary-foreground font-light",
            viewConfig.classNames?.monthDayNumber,
          )}
        >
          {format(
            toZoned(day, settings.timeZone),
            settings.i18n.formats.monthCellDay,
            { locale: settings.locale },
          )}
        </span>
      </div>
    </>
  );

  const content =
    viewConfig.renderMonthCell?.({
      day,
      segments,
      isToday,
      isOutside,
      overflowCount,
      defaultContent,
    }) ?? defaultContent;

  return (
    <div
      ref={rootRef}
      role="gridcell"
      tabIndex={-1}
      data-slot="calendar-month-cell"
      data-today={isToday || undefined}
      data-outside={isOutside || undefined}
      data-weekend={
        settings.weekendDays.includes(
          toZoned(day, settings.timeZone).getDay(),
        ) || undefined
      }
      data-cal-day={dayStart.getTime()}
      data-drop-target={isDropTarget ?? undefined}
      data-off={isOff || undefined}
      data-draft={inDraft ? "" : undefined}
      aria-label={format(
        toZoned(day, settings.timeZone),
        settings.i18n.formats.monthCellAriaLabel,
        { locale: settings.locale },
      )}
      className={cn(
        "group/cal-cell relative flex min-h-0 min-w-0 flex-col overflow-hidden",
        !isLast && "border-e",
        isOutside && !settings.showOutsideDays && "invisible",
        isOff && offClassName,
        isToday &&
          cn(
            "bg-primary/3 border-b-primary/40 relative border-b-2",
            viewConfig.todayClassName,
          ),
        viewConfig.dayClassName?.(day),
        // No drop-target bg fill on move/resize - the dragged bar + not-allowed
        // cursor carry the feedback; a cell-wide color wash is too distracting.
        // data-drop-target stays as an opt-in styling hook.
        inDraft && "bg-primary/5",
        viewConfig.classNames?.monthCell,
      )}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-slot=calendar-chip]")) return;
        if (target.closest("[data-slot=calendar-more]")) return;
        gestures.beginCreate(e, day, true);
      }}
      onClick={(e) => {
        if (wasRecentDrag() || wasRecentChipPress()) return;
        settings.onSlotClick?.({ date: day, allDay: true, view: "month" }, e);
      }}
    >
      {inDraft && (
        <span
          aria-hidden
          data-slot="calendar-slot-draft"
          className={cn(
            "border-primary/40 pointer-events-none absolute inset-0 z-10 border-y border-dashed",
            inDraft.isStart && "border-s",
            inDraft.isEnd && "border-e",
            viewConfig.classNames?.slotDraft,
          )}
        />
      )}
      {content}
    </div>
  );
}

interface CalendarMoreIndicatorProps {
  day: Date;
  count: number;
  /** The OVERFLOW (hidden) segments for this day - bars first, then timed. The
   *  popover lists only these, never the chips already visible in the cell. */
  segments: CalendarSegment[];
  /** Set while a timed chip is dragged and will land in THIS overflow bucket:
   *  the indicator itself becomes the drop placeholder (dashed, event-tinted) so
   *  it reads as "the chip joins the +N more list". */
  dropInto?: { color?: string; valid: boolean };
}

/**
 * "+N more" trigger opening a popover with the day's full event list.
 * onMoreClick returning false suppresses the built-in popover.
 */
function CalendarMoreIndicator({
  day,
  count,
  segments,
  dropInto,
}: CalendarMoreIndicatorProps) {
  const settings = useCalendarSettings();
  const viewConfig = useCalendarViewConfig();
  const [open, setOpen] = useState(false);
  const headerId = useId();

  // Grabbing a chip from this list starts a drag; close the popover so it does
  // not sit over the drop target while the event is carried to another day.
  const isDragging = useCalendarSelector<unknown, boolean>(
    (state) => state.drag !== null,
  );
  useEffect(() => {
    if (isDragging) setOpen(false);
  }, [isDragging]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-slot="calendar-more"
        data-drop-into={dropInto ? "" : undefined}
        data-drop-invalid={dropInto && !dropInto.valid ? "" : undefined}
        className={cn(
          "text-muted-foreground hover:text-foreground cursor-pointer truncate rounded-sm px-1.5 text-start",
          // While a dragged chip will land in this overflow bucket, the "+N more"
          // link itself becomes the drop placeholder: dashed, event-tinted, one
          // chip tall, so the drop target is unmistakable.
          dropInto &&
            cn(
              "flex shrink-0 items-center border border-dashed",
              dropInto.valid
                ? "text-foreground border-(--cal-event-color)/50 bg-(--cal-event-color)/8"
                : "border-destructive/70 bg-destructive/10 text-destructive",
            ),
          viewConfig.classNames?.moreIndicator,
        )}
        style={
          dropInto
            ? ({
                "--cal-event-color": dropInto.color ?? "var(--color-primary)",
                height: "calc(var(--cal-month-bar-h, 1.75rem) - 0.125rem)",
              } as CSSProperties)
            : undefined
        }
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          const verdict = settings.onMoreClick?.(
            day,
            segments.map((segment) => segment.occurrence),
            e,
          );
          if (verdict === false) {
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        {viewConfig.renderMoreIndicator?.({ day, count, segments }) ??
          settings.i18n.labels.more(count)}
      </PopoverTrigger>
      <PopoverContent
        data-slot="calendar-more-popover"
        align={viewConfig.morePopoverAlign}
        // The popover is a dialog, so it needs a name. The built-in body already
        // renders the day header this list belongs to, so point at that; a
        // consumer body has no header to point at and gets the same formatted
        // day as a label instead.
        aria-labelledby={viewConfig.renderMoreContent ? undefined : headerId}
        aria-label={
          viewConfig.renderMoreContent
            ? format(
                toZoned(day, settings.timeZone),
                settings.i18n.formats.moreDayHeader,
                { locale: settings.locale },
              )
            : undefined
        }
        // PopoverContent is unlayered (flex-col gap-4 p-4); override with !.
        // text-xs re-establishes the calendar's base type here because this
        // content is portaled out of the root subtree and cannot inherit it.
        className={cn(
          "w-64 gap-1! p-2! text-xs",
          viewConfig.classNames?.morePopover,
        )}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {viewConfig.renderMoreContent ? (
          viewConfig.renderMoreContent({
            day,
            segments,
            close: () => setOpen(false),
          })
        ) : (
          <CalendarMoreDefaultContent
            day={day}
            segments={segments}
            headerId={headerId}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Built-in "+N more" popover body: day header + the day's chips. */
function CalendarMoreDefaultContent({
  day,
  segments,
  headerId,
}: {
  day: Date;
  segments: CalendarSegment[];
  /** Names the popover dialog: the header IS the list's accessible name. */
  headerId?: string;
}) {
  const settings = useCalendarSettings();
  const viewConfig = useCalendarViewConfig();
  return (
    <>
      <div
        id={headerId}
        className={cn(
          "text-muted-foreground px-1 py-1 text-xs font-medium",
          viewConfig.classNames?.morePopoverHeader,
        )}
      >
        {format(
          toZoned(day, settings.timeZone),
          settings.i18n.formats.moreDayHeader,
          { locale: settings.locale },
        )}
      </div>
      {/* The scroll region breaks out of the popover's right padding (-me-2)
            so the scrollbar sits flush in the gutter; the list then pads itself
            back (ps-1 aligns with the header, pe-4 clears the ~10px bar with a
            gap) and adds py-1 so the first/last focus ring is not clipped by
            the overflow. Layout is identical with or without a scrollbar. */}
      {viewConfig.scrollbars === "native" ? (
        <div
          data-cal-native-scroll=""
          className="-me-2 max-h-(--cal-more-max-height,16rem) min-h-0 overflow-y-auto"
        >
          <div className="flex flex-col gap-1 py-1 ps-1 pe-4">
            {segments.map((segment) => (
              <CalendarChip
                key={segment.occurrence.key}
                segment={segment}
                className="py-0.5"
              />
            ))}
          </div>
        </div>
      ) : (
        <ScrollArea className="-me-2 min-h-0 **:data-[slot=scroll-area-viewport]:max-h-(--cal-more-max-height,16rem)">
          <div className="flex flex-col gap-1 py-1 ps-1 pe-4">
            {segments.map((segment) => (
              <CalendarChip
                key={segment.occurrence.key}
                segment={segment}
                className="py-0.5"
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );
}

export type { CalendarMonthViewProps, CalendarMoreIndicatorProps };
export { CalendarMonthView, CalendarMoreIndicator };
