/** biome-ignore-all lint: Vendored ReUI registry component. */
"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { addDays, addMinutes } from "date-fns";
import { type CSSProperties, useEffect, useMemo, useRef } from "react";
import {
  CalendarViewContext,
  useCalendar,
  useCalendarDay,
  useCalendarSelector,
  useCalendarSettings,
  useCalendarViewConfig,
  useCalendarViewSettings,
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
  flattenResources,
  getDayKey,
  getDayTotalMinutes,
  packTimedSegments,
  resolveOffDay,
  snapMinutes,
  toZoned,
  zonedStartOfDay,
} from "@/components/calendar/calendar-lib";
import {
  CalendarNowIndicator,
  CalendarTimeGutter,
  minuteBlockStyle,
} from "@/components/calendar/calendar-time-grid";
import type {
  CalendarResource,
  CalendarSegment,
} from "@/components/calendar/calendar-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const EMPTY_ALL_DAY_SEGMENTS: CalendarSegment[] = [];
const RESOURCE_VIEW_CONTEXT = { view: "resource" } as const;

interface CalendarResourceViewProps extends useRender.ComponentProps<"div"> {
  dayStartHour?: number;
  dayEndHour?: number;
  showAllDay?: boolean;
  /** Gutter/gridline interval in minutes; defaults to the interval view config. */
  interval?: number;
}

/** Leaf resources become booking columns for the anchor day. */
function CalendarResourceView({
  className,
  render,
  dayStartHour,
  dayEndHour,
  showAllDay = true,
  interval: intervalProp,
  ...props
}: CalendarResourceViewProps) {
  const instance = useCalendar();
  const settings = useCalendarSettings();
  const viewConfig = useCalendarViewConfig();
  const { effective } = useCalendarViewSettings();
  const anchorDate = useCalendarSelector((state) => state.date, {
    isEqual: (a, b) => a.getTime() === b.getTime(),
  });

  const startHour = dayStartHour ?? settings.dayStartHour;
  const endHour = dayEndHour ?? settings.dayEndHour;
  const interval = Math.min(
    Math.max(intervalProp ?? viewConfig.interval, 5),
    240,
  );
  const contained = viewConfig.scrollMode !== "page";
  const day = zonedStartOfDay(anchorDate, settings.timeZone);

  const resources = useMemo(
    () =>
      flattenResources(settings.resources)
        .filter(({ resource }) => !resource.children?.length)
        .map(({ resource }) => resource),
    [settings.resources],
  );

  // Initial scroll + api.scrollToTime (same contract as the time grid)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!contained) return;
    const el = scrollRef.current;
    if (!el) return;
    const viewport = el.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    const slotRow = el.querySelector<HTMLElement>(
      "[data-slot=calendar-time-gutter] > div",
    );
    const slotPx = slotRow?.getBoundingClientRect().height || 64;
    const pxPerMinute = slotPx / interval;
    const scrollTo = (minutes: number) => {
      // keep the hour label above the target line visible (it hangs -top-2)
      viewport?.scrollTo({
        top: Math.max(0, (minutes - startHour * 60) * pxPerMinute - 12),
      });
    };
    scrollTo(viewConfig.scrollToHour * 60);
    instance.internals.registerScrollHandler((time) => {
      const minutes =
        typeof time === "number"
          ? time
          : toZoned(time, settings.timeZone).getHours() * 60 +
            toZoned(time, settings.timeZone).getMinutes();
      scrollTo(minutes);
    });
    // Classic (width-consuming) scrollbars squeeze the scrolling track while
    // the header/all-day rows outside keep full width, drifting the column
    // borders. Mirror the measured gutter onto those rows via a CSS var -
    // 0px for overlay scrollbars and the custom ScrollArea, so both modes
    // lay out identically.
    const root = el.closest<HTMLElement>(
      "[data-slot=calendar-time-grid], [data-slot=calendar-resource-view]",
    );
    const syncScrollbarGutter = () => {
      root?.style.setProperty(
        "--cal-scrollbar-w",
        `${viewport ? viewport.offsetWidth - viewport.clientWidth : 0}px`,
      );
    };
    syncScrollbarGutter();
    const gutterObserver = viewport
      ? new ResizeObserver(syncScrollbarGutter)
      : null;
    if (viewport) gutterObserver?.observe(viewport);
    return () => {
      instance.internals.registerScrollHandler(null);
      gutterObserver?.disconnect();
    };
  }, [
    contained,
    instance,
    settings.timeZone,
    startHour,
    interval,
    viewConfig.scrollToHour,
    // scrollbars custom<->native swaps the scroller DOM: re-bind the
    // viewport, the scroll wiring, and the measured --cal-scrollbar-w
    viewConfig.scrollbars,
  ]);

  const slots = useMemo(() => {
    const result: number[] = [];
    for (let m = startHour * 60; m < endHour * 60; m += interval) {
      result.push(m);
    }
    return result;
  }, [startHour, endHour, interval]);

  // All-day segments for renderAllDaySection - the same index bucket the
  // cells read; inert (stable empty array, so the subscription never
  // re-renders) while the override is unset.
  const allDaySegments = useCalendarSelector<unknown, CalendarSegment[]>(
    () =>
      viewConfig.renderAllDaySection
        ? (instance.internals
            .getIndex()
            .byDay.get(getDayKey(day, settings.timeZone))?.allDay ??
          EMPTY_ALL_DAY_SEGMENTS)
        : EMPTY_ALL_DAY_SEGMENTS,
    {
      isEqual: (a, b) =>
        a === b ||
        (a.length === b.length && a.every((segment, i) => segment === b[i])),
    },
  );

  const gridTemplateColumns = `repeat(${resources.length || 1}, minmax(var(--cal-resource-col-min,8rem), 1fr))`;

  const track = (
    <div className="relative flex">
      {/* shared gutter component, so renderTimeGutterSlot and
          classNames.timeGutter customizations apply here too */}
      <CalendarTimeGutter
        days={[day]}
        slots={slots}
        startHour={startHour}
        interval={interval}
      />
      <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns }}>
        {resources.map((resource) => (
          <CalendarResourceColumn
            key={resource.id}
            resource={resource}
            day={day}
            startHour={startHour}
            endHour={endHour}
            interval={interval}
          />
        ))}
      </div>
      {effective.nowIndicator && (
        <CalendarNowIndicator
          days={[day]}
          startHour={startHour}
          endHour={endHour}
        />
      )}
    </div>
  );

  const defaultProps = {
    "data-slot": "calendar-resource-view",
    "data-view": "resource",
    className: cn(
      "flex flex-col border-t",
      contained && "min-h-0 flex-1 overflow-hidden",
      viewConfig.classNames?.timeGrid,
      className,
    ),
    style: { "--cal-hour-height": "4rem" } as CSSProperties,
    children: (
      <>
        {/* Resource header row */}
        <div
          className={cn(
            "flex border-b pe-(--cal-scrollbar-w,0px)",
            !contained &&
              "bg-background sticky top-(--cal-sticky-offset,0px) z-20",
            viewConfig.classNames?.timeGridHeader,
          )}
        >
          <div className="w-(--cal-gutter-width,4.5rem) shrink-0 border-e" />
          <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns }}>
            {resources.map((resource) => (
              <div
                key={resource.id}
                data-slot="calendar-resource-header"
                className={cn(
                  "min-w-0 truncate border-e px-2 py-1.5 text-center font-medium last:border-e-0",
                  viewConfig.classNames?.resourceHeader,
                )}
              >
                {viewConfig.renderResourceHeader?.({ resource }) ??
                  resource.title}
              </div>
            ))}
          </div>
        </div>
        {/* All-day row per resource */}
        {showAllDay && (
          <div
            data-slot="calendar-all-day-section"
            className={cn(
              "flex border-b pe-(--cal-scrollbar-w,0px)",
              viewConfig.classNames?.allDaySection,
            )}
          >
            {viewConfig.renderAllDaySection?.({
              days: [day],
              segments: allDaySegments,
            }) ?? (
              <>
                <div
                  className={cn(
                    // pt-1.5 matches the all-day cell's top inset; the inner box is
                    // one bar-row tall and centers the label so it sits on the SAME
                    // baseline as the first all-day chip and stays top-aligned when
                    // the chips wrap onto more lanes (mirrors the time-grid label)
                    "text-muted-foreground w-(--cal-gutter-width,4.5rem) shrink-0 border-e ps-2 pe-2.5 pt-1.5",
                    viewConfig.classNames?.allDayLabel,
                  )}
                >
                  <span className="flex h-[calc(var(--cal-month-bar-h,1.625rem)-0.125rem)] items-center justify-end">
                    {settings.i18n.labels.allDay}
                  </span>
                </div>
                <div
                  className="grid min-w-0 flex-1"
                  style={{ gridTemplateColumns }}
                >
                  {resources.map((resource) => (
                    <CalendarResourceAllDayCell
                      key={resource.id}
                      resource={resource}
                      day={day}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {contained ? (
          <div ref={scrollRef} className="min-h-0 flex-1">
            {viewConfig.scrollbars === "native" ? (
              <div
                data-slot="scroll-area-viewport"
                data-cal-native-scroll=""
                className="h-full overflow-y-auto"
              >
                {track}
              </div>
            ) : (
              <ScrollArea className="h-full">{track}</ScrollArea>
            )}
          </div>
        ) : (
          track
        )}
      </>
    ),
  };

  return (
    <CalendarViewContext.Provider value={RESOURCE_VIEW_CONTEXT}>
      {useRender({
        defaultTagName: "div",
        render,
        props: mergeProps<"div">(defaultProps, props),
      })}
    </CalendarViewContext.Provider>
  );
}

function CalendarResourceAllDayCell({
  resource,
  day,
}: {
  resource: CalendarResource;
  day: Date;
}) {
  const settings = useCalendarSettings();
  const viewConfig = useCalendarViewConfig();
  const { effective } = useCalendarViewSettings();
  const gestures = useCalendarGestures();
  const { segments } = useCalendarDay(day);
  const mine = segments.allDay.filter(
    (segment) => segment.occurrence.event.resourceId === resource.id,
  );
  const dayStart = zonedStartOfDay(day, settings.timeZone);
  const dayEnd = addDays(toZoned(dayStart, settings.timeZone), 1);
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
      if (!drag || !drag.proposedDayGranular) return null;
      const covered =
        drag.proposedStart < dayEnd && drag.proposedEnd > dayStart;
      if (!covered) return null;
      return drag.valid ? "valid" : "invalid";
    },
  );
  // Slot-draft highlight, mirroring the time-grid all-day cell. The dnd
  // layer's all-day create branch does not plumb resourceId into the draft,
  // so every resource cell covering the day highlights together.
  const inDraft = useCalendarSelector<unknown, boolean>((state) => {
    const draft = state.slotDraft;
    if (!draft || !draft.allDay) return false;
    return draft.start < dayEnd && draft.end > dayStart;
  });
  return (
    <div
      role="gridcell"
      tabIndex={-1}
      aria-label={`${settings.i18n.labels.allDay}, ${resource.title}`}
      data-slot="calendar-all-day-cell"
      // data-cal-day makes this a DnD day target: without it collectSurface()
      // finds no cells and dragging an all-day chip silently converts it to
      // a timed event via the column branch
      data-cal-day={dayStart.getTime()}
      data-drop-target={isDropTarget ?? undefined}
      data-off={isOff || undefined}
      className={cn(
        // reserve one bar row so the all-day row keeps the same height with or
        // without events, matching the time-grid all-day row (which reserves
        // the same via its bars-grid minHeight)
        "relative flex min-h-[calc(var(--cal-month-bar-h,1.625rem)+0.625rem)] min-w-0 flex-col gap-0.5 border-e px-1 py-1.5 last:border-e-0",
        isOff && offClassName,
        viewConfig.dayClassName?.(day),
        inDraft && cn("bg-primary/10", viewConfig.classNames?.slotDraft),
        viewConfig.classNames?.allDayCell,
      )}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) gestures.beginCreate(e, day, true);
      }}
      onClick={(e) => {
        if (
          e.target === e.currentTarget &&
          !wasRecentDrag() &&
          !wasRecentChipPress()
        ) {
          settings.onSlotClick?.(
            {
              date: dayStart,
              allDay: true,
              view: "resource",
              resourceId: resource.id,
            },
            e,
          );
        }
      }}
    >
      {mine.map((segment) => (
        <CalendarChip
          key={segment.occurrence.key}
          segment={segment}
          // one bar-row tall, matching the time-grid all-day bars so the row
          // height stays identical across views (and equals the reserved min)
          className="h-[calc(var(--cal-month-bar-h,1.625rem)-0.125rem)]"
        />
      ))}
      {isDropTarget && (
        <span
          aria-hidden
          data-slot="calendar-drop-indicator"
          data-drop-target={isDropTarget}
          className={cn(
            "pointer-events-none absolute inset-0.5 z-10 rounded-sm border border-dashed",
            isDropTarget === "valid"
              ? "border-primary/50"
              : "border-destructive/60",
            viewConfig.classNames?.dropIndicator,
          )}
        />
      )}
    </div>
  );
}

function CalendarResourceColumn({
  resource,
  day,
  startHour,
  endHour,
  interval,
}: {
  resource: CalendarResource;
  day: Date;
  startHour: number;
  endHour: number;
  interval: number;
}) {
  const settings = useCalendarSettings();
  const viewConfig = useCalendarViewConfig();
  const { effective } = useCalendarViewSettings();
  const gestures = useCalendarGestures();
  const { segments, isToday } = useCalendarDay(day);
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

  const timeZone = settings.timeZone;
  const dayStart = zonedStartOfDay(day, timeZone);
  const totalMinutes = getDayTotalMinutes(day, timeZone);
  const boundsStartMin = startHour * 60;
  const boundsEndMin = Math.min(endHour * 60, totalMinutes);
  const boundsMinutes = Math.max(60, boundsEndMin - boundsStartMin);

  // Filter this resource's timed segments and repack per column.
  // Clones keep the shared index cache untouched. Segments the day bounds clip
  // away are dropped here too, otherwise they hold a column nobody can see and
  // leave a phantom empty half beside the first in-bounds chip.
  const packed = useMemo(() => {
    const mine = segments.timed
      .filter((segment) => {
        if (segment.occurrence.event.resourceId !== resource.id) return false;
        const startMin = Math.max(segment.startMin ?? 0, boundsStartMin);
        const endMin = Math.min(segment.endMin ?? startMin, boundsEndMin);
        return endMin > boundsStartMin && startMin < boundsEndMin;
      })
      .map((segment) => ({ ...segment }) as CalendarSegment);
    packTimedSegments(mine);
    return mine;
  }, [segments.timed, resource.id, boundsStartMin, boundsEndMin]);

  const dragGhost = useCalendarSelector<
    unknown,
    {
      window: [number, number];
      valid: boolean;
      kind: string;
      color?: string;
      title: string;
      occurrence: CalendarSegment["occurrence"];
      proposedStart: Date;
      proposedEnd: Date;
    } | null
  >(
    (state) => {
      const drag = state.drag;
      if (!drag || drag.proposedDayGranular) return null;
      // Moves carry a proposedResourceId (they can cross columns); resizes stay
      // in place and leave it undefined, so fall back to the event's own
      // resource - otherwise the resize ghost is filtered out of every column.
      const targetResourceId =
        drag.proposedResourceId ?? drag.occurrence.event.resourceId;
      if (targetResourceId !== resource.id) return null;
      const from = Math.max(
        (drag.proposedStart.getTime() - dayStart.getTime()) / 60000,
        boundsStartMin,
      );
      const to = Math.min(
        (drag.proposedEnd.getTime() - dayStart.getTime()) / 60000,
        boundsEndMin,
      );
      if (to <= from) return null;
      return {
        window: [from, to] as [number, number],
        valid: drag.valid,
        kind: drag.kind,
        color: drag.occurrence.event.color,
        title: drag.occurrence.event.title,
        occurrence: drag.occurrence,
        proposedStart: drag.proposedStart,
        proposedEnd: drag.proposedEnd,
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.window[0] === b.window[0] &&
          a.window[1] === b.window[1] &&
          a.valid === b.valid &&
          a.proposedStart.getTime() === b.proposedStart.getTime() &&
          a.proposedEnd.getTime() === b.proposedEnd.getTime()),
    },
  );

  const draftWindow = useCalendarSelector<unknown, [number, number] | null>(
    (state) => {
      const draft = state.slotDraft;
      if (!draft || draft.allDay || draft.resourceId !== resource.id) {
        return null;
      }
      const from = Math.max(
        (draft.start.getTime() - dayStart.getTime()) / 60000,
        boundsStartMin,
      );
      const to = Math.min(
        (draft.end.getTime() - dayStart.getTime()) / 60000,
        boundsEndMin,
      );
      return to > from ? [from, to] : null;
    },
    {
      isEqual: (a, b) =>
        a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1]),
    },
  );

  return (
    <div
      data-slot="calendar-day-column"
      data-today={isToday || undefined}
      data-off={isOff || undefined}
      data-cal-day={dayStart.getTime()}
      data-cal-bounds-start={boundsStartMin}
      data-cal-bounds-end={boundsEndMin}
      data-cal-resource={resource.id}
      data-drop-target={
        dragGhost ? (dragGhost.valid ? "valid" : "invalid") : undefined
      }
      role="group"
      aria-label={resource.title}
      className={cn(
        "relative min-w-0 border-e last:border-e-0",
        isOff && offClassName,
        // the resource view is a single day, so today gets no column tint (the
        // header marks it); only a consumer todayClassName can tint it
        isToday && viewConfig.todayClassName,
        viewConfig.dayClassName?.(day),
        viewConfig.classNames?.dayColumn,
      )}
      style={{
        height: `calc(var(--cal-hour-height) * ${boundsMinutes / 60})`,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent calc(var(--cal-hour-height) * ${interval / 60} - var(--cal-slot-line-width, 1px)), var(--cal-slot-line-color, var(--color-border)) calc(var(--cal-hour-height) * ${interval / 60} - var(--cal-slot-line-width, 1px)), var(--cal-slot-line-color, var(--color-border)) calc(var(--cal-hour-height) * ${interval / 60}))`,
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) gestures.beginCreate(e, day, false);
      }}
      onClick={(e) => {
        if (
          e.target !== e.currentTarget ||
          wasRecentDrag() ||
          wasRecentChipPress()
        )
          return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pxPerMinute = rect.height / boundsMinutes;
        const minutes = snapMinutes(
          boundsStartMin + (e.clientY - rect.top) / pxPerMinute,
          settings.snapDuration,
        );
        const clamped = Math.min(
          Math.max(minutes, boundsStartMin),
          boundsEndMin - settings.slotDuration,
        );
        settings.onSlotClick?.(
          {
            date: addMinutes(dayStart, clamped),
            end: addMinutes(dayStart, clamped + settings.slotDuration),
            allDay: false,
            view: "resource",
            resourceId: resource.id,
          },
          e,
        );
      }}
    >
      {packed.map((segment) => {
        const startMin = Math.max(segment.startMin ?? 0, boundsStartMin);
        const endMin = Math.min(segment.endMin ?? startMin, boundsEndMin);
        if (endMin <= boundsStartMin || startMin >= boundsEndMin) return null;
        const columnCount = segment.columnCount ?? 1;
        const column = segment.column ?? 0;
        const span = segment.columnSpan ?? 1;
        const zIndex = segment.occurrence.event.zIndex ?? 10 + column;
        // Strict side-by-side columns - no cascade overlap (fade-truncate +
        // hover reveal carry the legibility); the ring separates neighbors.
        const colPct = 100 / columnCount;
        return (
          <div
            key={segment.occurrence.key}
            // min-h keeps 15-min chips readable (Google-style: the block may
            // slightly outgrow its true window); hover raises a squeezed
            // cascade chip above its overlapping neighbors
            className="absolute z-(--cal-z) min-h-(--cal-event-min-h,1.5rem) px-0.5 hover:z-40"
            style={
              {
                ...minuteBlockStyle(startMin, endMin, boundsStartMin),
                left: `${column * colPct}%`,
                width: `${span * colPct}%`,
                "--cal-z": zIndex,
              } as CSSProperties
            }
          >
            <CalendarChip
              segment={segment}
              className={cn(
                columnCount > 1 && "ring-background ring-1",
                // short chips: single centered row, exact-fit line height so
                // the title never slices mid-glyph
                endMin - startMin < viewConfig.compactEventMinutes
                  ? "h-full gap-1 py-0 leading-4"
                  : "h-full flex-col items-start justify-start gap-0 py-1",
                viewConfig.classNames?.timedChip,
              )}
            />
          </div>
        );
      })}
      {/* Standardized ghost (CALENDAR_GHOST): faint drop placeholder
          for moves (the cursor-attached carry clone owns the visual), dashed
          clone for resizes, destructive marking when invalid. */}
      {dragGhost && (
        <div
          data-slot="calendar-drag-ghost"
          data-kind={dragGhost.kind}
          data-drop-invalid={!dragGhost.valid || undefined}
          className={cn(
            "pointer-events-none absolute inset-x-0.5 z-50 min-h-(--cal-event-min-h,1.5rem)",
            dragGhost.kind === "move"
              ? cn(
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
              ...minuteBlockStyle(
                dragGhost.window[0],
                dragGhost.window[1],
                boundsStartMin,
              ),
              "--cal-event-color": dragGhost.color ?? "var(--color-primary)",
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
                  allDay: false,
                },
                day,
                isStart: true,
                isEnd: true,
                continuesBefore: false,
                continuesAfter: false,
                startMin: dragGhost.window[0],
                endMin: dragGhost.window[1],
              }}
              className={cn(
                dragGhost.window[1] - dragGhost.window[0] <
                  viewConfig.compactEventMinutes
                  ? "h-full gap-1 py-0 leading-4"
                  : "h-full flex-col items-start justify-start gap-0 py-1",
                viewConfig.classNames?.timedChip,
                "inset-ring-0",
                !dragGhost.valid && CALENDAR_GHOST.invalidContent,
              )}
            />
          )}
        </div>
      )}
      {draftWindow && (
        <div
          data-slot="calendar-slot-draft"
          className={cn(
            "border-primary/40 bg-primary/5 pointer-events-none absolute inset-x-0.5 z-40 rounded-sm border border-dashed",
            viewConfig.classNames?.slotDraft,
          )}
          style={minuteBlockStyle(
            draftWindow[0],
            draftWindow[1],
            boundsStartMin,
          )}
        />
      )}
    </div>
  );
}

export type { CalendarResourceViewProps };
export { CalendarResourceView };
