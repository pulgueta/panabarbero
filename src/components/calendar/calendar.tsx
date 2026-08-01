/** biome-ignore-all lint: Vendored ReUI registry component. */
"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { addDays, type Locale } from "date-fns";
import {
  type ComponentType,
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type CalendarI18nConfig,
  type CalendarI18nOverrides,
  mergeCalendarI18n,
} from "@/components/calendar/calendar-i18n";
import {
  buildCalendarIndex,
  type CalendarDayBucket,
  type CalendarIndex,
  defaultOccurrenceOrder,
  eventsOverlap,
  getDayKey,
  getRangeKey,
  getViewDateRange,
  stepDate,
  toZoned,
  type WeekStartsOn,
  zonedStartOfDay,
} from "@/components/calendar/calendar-lib";
import type {
  CalendarDateRange,
  CalendarDragState,
  CalendarEvent,
  CalendarEventId,
  CalendarInteractions,
  CalendarOccurrence,
  CalendarOffDaysConfig,
  CalendarProposedUpdate,
  CalendarRangeInfo,
  CalendarResource,
  CalendarSegment,
  CalendarSelection,
  CalendarSlotDraft,
  CalendarSlotInfo,
  CalendarState,
  CalendarUpdateResult,
  CalendarView,
  CalendarViewSettings,
} from "@/components/calendar/calendar-types";

import { cn } from "@/lib/utils";

const BASE_VIEWS: CalendarView[] = ["month", "week", "day", "days", "agenda"];
const ALL_VIEWS: CalendarView[] = [...BASE_VIEWS, "resource"];

const DEFAULT_INTERACTIONS: CalendarInteractions = {
  drag: true,
  resize: true,
  selectSlot: true,
};

const EMPTY_SELECTION: CalendarSelection = { eventKeys: [], slot: null };

// resolveSettings runs on every render, so a freshly allocated default would
// bust the view memos keyed on it (the month grid rebuilds its 42 zoned day
// starts whenever weekendDays changes identity). Shared, never mutated.
const DEFAULT_WEEKEND_DAYS: number[] = [0, 6];
const EMPTY_RESOURCES: CalendarResource[] = [];
const DEFAULT_EVENT_PRIORITY = (event: CalendarEvent<never>) =>
  event.priority ?? 0;

// Priority-aware default order, cached on the resolver identity: eventOrder is
// part of the index cache key, so a fresh closure per render would rebuild the
// whole index on every render.
const priorityOrderCache = new WeakMap<object, unknown>();
type OccurrenceOrder<TData> = (
  a: CalendarOccurrence<TData>,
  b: CalendarOccurrence<TData>,
) => number;
function priorityOccurrenceOrder<TData>(
  getEventPriority: (event: CalendarEvent<TData>) => number,
): OccurrenceOrder<TData> {
  const cached = priorityOrderCache.get(getEventPriority);
  if (cached) return cached as OccurrenceOrder<TData>;
  // higher priority packs and orders first; ties fall through to the
  // start/duration/key default
  const order: OccurrenceOrder<TData> = (a, b) =>
    getEventPriority(b.event) - getEventPriority(a.event) ||
    defaultOccurrenceOrder(a, b);
  priorityOrderCache.set(getEventPriority, order);
  return order;
}

interface CalendarCallbacks<TData = unknown> {
  onEventClick?: (
    occurrence: CalendarOccurrence<TData>,
    e: React.MouseEvent,
  ) => void;
  onEventDoubleClick?: (
    occurrence: CalendarOccurrence<TData>,
    e: React.MouseEvent,
  ) => void;
  onEventUpdate?: (
    update: CalendarProposedUpdate<TData>,
  ) => CalendarUpdateResult;
  canDropEvent?: (update: CalendarProposedUpdate<TData>) => boolean;
  /**
   * A move/resize was attempted on an event that cannot be dragged (readOnly,
   * per-event draggable/resizable false, or the interaction is off). Fires once
   * per gesture when the pointer crosses the activation threshold; the calendar
   * shows a not-allowed cursor for the duration but never picks the message -
   * broadcast it here so the consumer can surface a custom one.
   */
  onDragBlocked?: (
    occurrence: CalendarOccurrence<TData>,
    info: {
      gesture: "move" | "resize";
      reason: "readOnly" | "disabled" | "interactions-off";
    },
  ) => void;
  onSlotClick?: (slot: CalendarSlotInfo, e: React.MouseEvent) => void;
  onSelectSlot?: (slot: CalendarSlotDraft) => void;
  canSelectSlot?: (slot: CalendarSlotDraft) => boolean;
  onRangeChange?: (info: CalendarRangeInfo) => void;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  onDayCountChange?: (count: number) => void;
  onSelectionChange?: (selection: CalendarSelection) => void;
  onInteractionsChange?: (interactions: CalendarInteractions) => void;
  onViewSettingsChange?: (viewSettings: CalendarViewSettings) => void;
  onEventsChange?: (events: CalendarEvent<TData>[]) => void;
  onMoreClick?: (
    day: Date,
    segments: CalendarOccurrence<TData>[],
    e: React.MouseEvent,
  ) => void | false;
}

interface UseCalendarStateOptions<TData = unknown>
  extends CalendarCallbacks<TData> {
  events?: CalendarEvent<TData>[];
  defaultEvents?: CalendarEvent<TData>[];
  view?: CalendarView;
  defaultView?: CalendarView;
  date?: Date;
  defaultDate?: Date;
  dayCount?: number;
  defaultDayCount?: number;
  selection?: CalendarSelection;
  defaultSelection?: CalendarSelection;
  interactions?: Partial<CalendarInteractions>;
  defaultInteractions?: Partial<CalendarInteractions>;
  viewSettings?: CalendarViewSettings;
  defaultViewSettings?: CalendarViewSettings;
  loading?: boolean;
  views?: CalendarView[];
  timeZone?: string;
  locale?: Locale;
  weekStartsOn?: WeekStartsOn;
  dayStartHour?: number;
  dayEndHour?: number;
  slotDuration?: number;
  snapDuration?: number;
  agendaDayCount?: number;
  fixedWeeks?: boolean;
  showOutsideDays?: boolean;
  i18n?: CalendarI18nOverrides;
  /** Bookable resources for the resource view. */
  resources?: CalendarResource[];
  getEventPriority?: (event: CalendarEvent<TData>) => number;
  eventOrder?: (
    a: CalendarOccurrence<TData>,
    b: CalendarOccurrence<TData>,
  ) => number;
  getOccurrences?: (
    event: CalendarEvent<TData>,
    range: CalendarDateRange,
    ctx: { timeZone: string },
  ) => Array<{ start: Date; end: Date }> | null;
  /**
   * Weekday numbers (0 = Sunday) treated as the weekend by the "weekends"
   * view toggle. @default [0, 6]
   */
  weekendDays?: number[];
  /** Pointer-gesture tuning (activation distances, touch delay, autoscroll). */
  activation?: Partial<CalendarActivationConfig>;
}

interface CalendarActivationConfig {
  moveDistancePx: number;
  createDistancePx: number;
  touchDelayMs: number;
  touchTolerancePx: number;
  autoScrollEdgePx: number;
  autoScrollMaxStepPx: number;
}

/**
 * Resolved configuration: every UseCalendarStateOptions field except the
 * controlled/uncontrolled state pairs, with defaults applied and i18n merged.
 * Read via ref semantics - callback identity changes never re-render the grid.
 */
interface CalendarSettings<TData = unknown> extends CalendarCallbacks<TData> {
  timeZone: string;
  locale?: Locale;
  weekStartsOn: WeekStartsOn;
  views: CalendarView[];
  dayStartHour: number;
  dayEndHour: number;
  slotDuration: number;
  snapDuration: number;
  agendaDayCount: number;
  fixedWeeks: boolean;
  showOutsideDays: boolean;
  i18n: CalendarI18nConfig;
  resources: CalendarResource[];
  weekendDays: number[];
  activation?: Partial<CalendarActivationConfig>;
  getEventPriority: (event: CalendarEvent<TData>) => number;
  eventOrder: (
    a: CalendarOccurrence<TData>,
    b: CalendarOccurrence<TData>,
  ) => number;
  getOccurrences?: (
    event: CalendarEvent<TData>,
    range: CalendarDateRange,
    ctx: { timeZone: string },
  ) => Array<{ start: Date; end: Date }> | null;
}

interface CalendarApi<TData = unknown> {
  next(): void;
  prev(): void;
  today(): void;
  goTo(date: Date): void;
  setView(view: CalendarView, opts?: { dayCount?: number }): void;
  setDayCount(count: number): void;
  getEvents(): CalendarEvent<TData>[];
  getEvent(id: CalendarEventId): CalendarEvent<TData> | undefined;
  setEvents(events: CalendarEvent<TData>[]): void;
  addEvent(event: CalendarEvent<TData>): void;
  updateEvent(id: CalendarEventId, patch: Partial<CalendarEvent<TData>>): void;
  removeEvent(id: CalendarEventId): void;
  getOccurrences(range?: CalendarDateRange): CalendarOccurrence<TData>[];
  getOccurrencesForDay(day: Date): CalendarOccurrence<TData>[];
  findOverlapping(candidate: {
    start: Date;
    end: Date;
    excludeEventId?: string;
  }): CalendarOccurrence<TData>[];
  select(selection: Partial<CalendarSelection>): void;
  selectEvent(key: string, opts?: { additive?: boolean }): void;
  clearSelection(): void;
  setInteractions(patch: Partial<CalendarInteractions>): void;
  setViewSettings(patch: CalendarViewSettings): void;
  getVisibleRange(): CalendarDateRange;
  getActiveRange(): CalendarDateRange;
  /** TZDate in the calendar's display time zone. */
  toZoned(date: Date): Date;
  /** number = minutes from the zoned day start; no-op outside time-grid views. */
  scrollToTime(time: Date | number): void;
}

/** Cross-file plumbing for sibling view/interaction modules; not public API. */
interface CalendarInternals<TData = unknown> {
  getIndex(): CalendarIndex<TData>;
  setDrag(drag: CalendarDragState<TData> | null): void;
  setSlotDraft(draft: CalendarSlotDraft | null): void;
  registerScrollHandler(handler: ((time: Date | number) => void) | null): void;
  applyProposedUpdate(
    update: CalendarProposedUpdate<TData>,
    extraPatch?: Partial<CalendarEvent<TData>>,
  ): boolean;
  getSettingsVersion(): number;
  /** The rendered calendar root element, or null before mount. */
  getRootEl(): HTMLElement | null;
  setRootEl(el: HTMLElement | null): void;
}

interface CalendarInstance<TData = unknown> {
  getState(): CalendarState<TData>;
  subscribe(listener: () => void): () => void;
  api: CalendarApi<TData>;
  settings: CalendarSettings<TData>;
  internals: CalendarInternals<TData>;
}

function resolveSettings<TData>(
  options: UseCalendarStateOptions<TData>,
): CalendarSettings<TData> {
  const {
    // strip state pairs; the rest flows into settings
    events: _e,
    defaultEvents: _de,
    view: _v,
    defaultView: _dv,
    date: _d,
    defaultDate: _dd,
    dayCount: _dc,
    defaultDayCount: _ddc,
    selection: _s,
    defaultSelection: _ds,
    interactions: _i,
    defaultInteractions: _di,
    viewSettings: _vs,
    defaultViewSettings: _dvs,
    loading: _l,
    ...rest
  } = options;
  const getEventPriority =
    options.getEventPriority ??
    (DEFAULT_EVENT_PRIORITY as (event: CalendarEvent<TData>) => number);
  return {
    ...rest,
    timeZone:
      options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: options.locale,
    // locale-first default: a de/fr locale gets Monday weeks without also
    // having to set weekStartsOn; an explicit weekStartsOn always wins
    weekStartsOn:
      options.weekStartsOn ?? options.locale?.options?.weekStartsOn ?? 0,
    // the resource view only makes sense with resources configured
    views:
      options.views ?? (options.resources?.length ? ALL_VIEWS : BASE_VIEWS),
    dayStartHour: options.dayStartHour ?? 0,
    dayEndHour: options.dayEndHour ?? 24,
    slotDuration: options.slotDuration ?? 30,
    snapDuration: options.snapDuration ?? 15,
    agendaDayCount: options.agendaDayCount ?? 30,
    fixedWeeks: options.fixedWeeks ?? true,
    showOutsideDays: options.showOutsideDays ?? true,
    i18n: mergeCalendarI18n(options.i18n),
    resources: options.resources ?? EMPTY_RESOURCES,
    getEventPriority,
    eventOrder: options.eventOrder ?? priorityOccurrenceOrder(getEventPriority),
    getOccurrences: options.getOccurrences,
    weekendDays: options.weekendDays ?? DEFAULT_WEEKEND_DAYS,
    activation: options.activation,
  };
}

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (process.env.NODE_ENV !== "production" && !warned.has(key)) {
    warned.add(key);
    console.warn(`[calendar] ${message}`);
  }
}

interface CalendarStore<TData> {
  instance: CalendarInstance<TData>;
  setOptions(next: UseCalendarStateOptions<TData>): boolean;
  notify(): void;
  emitRangeIfChanged(): void;
}

function createCalendarStore<TData>(
  initial: UseCalendarStateOptions<TData>,
): CalendarStore<TData> {
  let options = initial;
  let settings = resolveSettings(initial);
  let settingsVersion = 0;

  const listeners = new Set<() => void>();

  const resolveView = (view: CalendarView): CalendarView => {
    if (settings.views.includes(view)) return view;
    const fallback = settings.views[0] ?? "month";
    warnOnce(
      `view-${view}`,
      `view "${view}" is not in views [${settings.views.join(", ")}]; falling back to "${fallback}".`,
    );
    return fallback;
  };

  const internal = {
    view: resolveView(initial.defaultView ?? "month"),
    date: initial.defaultDate ?? new Date(),
    dayCount: initial.defaultDayCount ?? 3,
    events: initial.defaultEvents ?? [],
    selection: initial.defaultSelection ?? EMPTY_SELECTION,
    interactions: { ...DEFAULT_INTERACTIONS, ...initial.defaultInteractions },
    viewSettings: initial.defaultViewSettings ?? {},
    drag: null as CalendarDragState<TData> | null,
    slotDraft: null as CalendarSlotDraft | null,
  };

  let snapshot: CalendarState<TData> | null = null;
  let indexCache: {
    events: CalendarEvent<TData>[];
    rangeKey: string;
    timeZone: string;
    weekStartsOn: WeekStartsOn;
    eventOrder: CalendarSettings<TData>["eventOrder"];
    getOccurrences: CalendarSettings<TData>["getOccurrences"];
    index: CalendarIndex<TData>;
  } | null = null;
  // Second single-entry cache, for api.getOccurrences(range) outside the
  // visible range: that branch builds a throwaway index, so without it every
  // call hands back brand new occurrence OBJECTS and the identity-based
  // isEqual in useCalendarOccurrences can never settle - an unstable
  // getSnapshot is a hard render loop under useSyncExternalStore, not a slow
  // render.
  let rangeCache: {
    events: CalendarEvent<TData>[];
    rangeKey: string;
    timeZone: string;
    weekStartsOn: WeekStartsOn;
    eventOrder: CalendarSettings<TData>["eventOrder"];
    getOccurrences: CalendarSettings<TData>["getOccurrences"];
    occurrences: CalendarOccurrence<TData>[];
  } | null = null;
  let scrollHandler: ((time: Date | number) => void) | null = null;
  // The rendered calendar root element, registered by the <Calendar> host.
  // The drag engine falls back to it to find day cells when a gesture starts
  // from a portaled surface (e.g. a chip inside the "+N more" popover), whose
  // DOM ancestors do not include the calendar.
  let rootEl: HTMLElement | null = null;
  let lastEmittedRangeKey: string | null = null;

  // Controlled interactions merge, cached on input identity: rebuilding the
  // merged object per snapshot would break Object.is for selector hooks.
  let interactionsCache: {
    input: Partial<CalendarInteractions>;
    merged: CalendarInteractions;
  } | null = null;
  const mergedInteractions = (
    input: Partial<CalendarInteractions>,
  ): CalendarInteractions => {
    if (interactionsCache?.input !== input) {
      interactionsCache = {
        input,
        merged: { ...DEFAULT_INTERACTIONS, ...input },
      };
    }
    return interactionsCache.merged;
  };

  const invalidate = () => {
    snapshot = null;
  };

  const notify = () => {
    listeners.forEach((listener) => listener());
    emitRangeIfChanged();
  };

  const getState = (): CalendarState<TData> => {
    if (snapshot) return snapshot;
    const view = resolveView(options.view ?? internal.view);
    const date = options.date ?? internal.date;
    const dayCount = Math.max(1, options.dayCount ?? internal.dayCount);
    const { visibleRange, activeRange } = getViewDateRange(view, date, {
      timeZone: settings.timeZone,
      weekStartsOn: settings.weekStartsOn,
      dayCount,
      agendaDayCount: settings.agendaDayCount,
      fixedWeeks: settings.fixedWeeks,
    });
    snapshot = {
      view,
      date,
      dayCount,
      visibleRange,
      activeRange,
      events: options.events ?? internal.events,
      selection: options.selection ?? internal.selection,
      interactions: options.interactions
        ? mergedInteractions(options.interactions)
        : internal.interactions,
      loading: options.loading ?? false,
      drag: internal.drag,
      slotDraft: internal.slotDraft,
      viewSettings: options.viewSettings ?? internal.viewSettings,
    };
    return snapshot;
  };

  const emitRangeIfChanged = () => {
    if (!settings.onRangeChange) return;
    const state = getState();
    const key = `${state.view}:${getRangeKey(state.visibleRange)}:${settings.timeZone}`;
    if (key === lastEmittedRangeKey) return;
    lastEmittedRangeKey = key;
    settings.onRangeChange({
      range: state.visibleRange,
      activeRange: state.activeRange,
      view: state.view,
      date: state.date,
      timeZone: settings.timeZone,
    });
  };

  type ControlledKey =
    | "view"
    | "date"
    | "dayCount"
    | "events"
    | "selection"
    | "interactions"
    | "viewSettings";

  const setField = <K extends ControlledKey>(
    key: K,
    value: CalendarState<TData>[K extends "events" ? "events" : K],
  ) => {
    const controlled = options[key] !== undefined;
    if (!controlled) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (internal as any)[key] = value;
      invalidate();
    }
    const callbacks: Record<ControlledKey, ((v: never) => void) | undefined> = {
      view: settings.onViewChange as never,
      date: settings.onDateChange as never,
      dayCount: settings.onDayCountChange as never,
      events: settings.onEventsChange as never,
      selection: settings.onSelectionChange as never,
      interactions: settings.onInteractionsChange as never,
      viewSettings: settings.onViewSettingsChange as never,
    };
    callbacks[key]?.(value as never);
    if (!controlled) notify();
  };

  // An occurrence key encodes the start instant (id::startISO), so committing a
  // move re-keys the occurrence and a selection holding the old key would point
  // at nothing. Remapped in the same commit and emitted BEFORE the events write
  // so a controlled consumer applies the two in a consistent order.
  const remapSelectionKey = (
    id: CalendarEventId,
    oldKey: string,
    nextStart: Date,
  ) => {
    const newKey = `${id}::${nextStart.toISOString()}`;
    if (newKey === oldKey) return;
    const selection = getState().selection;
    if (!selection.eventKeys.includes(oldKey)) return;
    setField("selection", {
      ...selection,
      eventKeys: selection.eventKeys.map((key) =>
        key === oldKey ? newKey : key,
      ),
    });
  };

  // extraPatch: non-timing fields committed in the SAME write. Two sequential
  // setField("events") calls break controlled mode - the second one re-reads
  // the still-stale controlled array and its onEventsChange payload silently
  // reverts the timing change the first one emitted.
  const applyProposedUpdate = (
    update: CalendarProposedUpdate<TData>,
    extraPatch?: Partial<CalendarEvent<TData>>,
  ): boolean => {
    const result = settings.onEventUpdate?.(update);
    if (result === false) return false;
    const adjusted: Partial<CalendarEvent<TData>> =
      result && typeof result === "object"
        ? {
            start: result.start ?? update.start,
            end: result.end ?? update.end,
            allDay: result.allDay ?? update.allDay,
          }
        : { start: update.start, end: update.end, allDay: update.allDay };
    if (update.resourceId !== undefined)
      adjusted.resourceId = update.resourceId;
    // the STORED event holds the pre-commit start, which is what the live
    // occurrence key was built from (update.event already carries the proposal
    // when the call comes from api.updateEvent)
    const stored = getState().events.find(
      (event) => event.id === update.event.id,
    );
    const oldKey =
      update.occurrence?.key ??
      (stored ? `${stored.id}::${stored.start.toISOString()}` : null);
    if (oldKey) {
      remapSelectionKey(
        update.event.id,
        oldKey,
        adjusted.start ?? update.start,
      );
    }
    const events = getState().events;
    const next = events.map((event) =>
      event.id === update.event.id
        ? { ...event, ...extraPatch, ...adjusted }
        : event,
    );
    setField("events", next);
    return true;
  };

  const getIndex = (): CalendarIndex<TData> => {
    const state = getState();
    const rangeKey = getRangeKey(state.visibleRange);
    if (
      indexCache &&
      indexCache.events === state.events &&
      indexCache.rangeKey === rangeKey &&
      indexCache.timeZone === settings.timeZone &&
      indexCache.weekStartsOn === settings.weekStartsOn &&
      indexCache.eventOrder === settings.eventOrder &&
      indexCache.getOccurrences === settings.getOccurrences
    ) {
      return indexCache.index;
    }
    const index = buildCalendarIndex(state.events, state.visibleRange, {
      timeZone: settings.timeZone,
      weekStartsOn: settings.weekStartsOn,
      eventOrder: settings.eventOrder,
      getOccurrences: settings.getOccurrences,
    });
    indexCache = {
      events: state.events,
      rangeKey,
      timeZone: settings.timeZone,
      weekStartsOn: settings.weekStartsOn,
      eventOrder: settings.eventOrder,
      getOccurrences: settings.getOccurrences,
      index,
    };
    return index;
  };

  const api: CalendarApi<TData> = {
    next() {
      const state = getState();
      setField(
        "date",
        stepDate(state.view, state.date, 1, {
          timeZone: settings.timeZone,
          dayCount: state.dayCount,
          agendaDayCount: settings.agendaDayCount,
        }),
      );
    },
    prev() {
      const state = getState();
      setField(
        "date",
        stepDate(state.view, state.date, -1, {
          timeZone: settings.timeZone,
          dayCount: state.dayCount,
          agendaDayCount: settings.agendaDayCount,
        }),
      );
    },
    today() {
      setField("date", new Date());
    },
    goTo(date) {
      setField("date", date);
    },
    setView(view, opts) {
      if (opts?.dayCount !== undefined) {
        setField("dayCount", Math.max(1, opts.dayCount));
      }
      setField("view", resolveView(view));
    },
    setDayCount(count) {
      setField("dayCount", Math.max(1, count));
    },
    getEvents() {
      return getState().events;
    },
    getEvent(id) {
      return getState().events.find((event) => event.id === id);
    },
    setEvents(events) {
      setField("events", events);
    },
    addEvent(event) {
      setField("events", [...getState().events, event]);
    },
    updateEvent(id, patch) {
      const event = api.getEvent(id);
      if (!event) return;
      const merged = { ...event, ...patch };
      const timingChanged =
        patch.start !== undefined ||
        patch.end !== undefined ||
        patch.allDay !== undefined;
      if (timingChanged && settings.onEventUpdate) {
        // single write: the non-timing rest rides along as extraPatch so
        // controlled mode sees one consistent onEventsChange payload
        const rest = { ...patch };
        delete rest.start;
        delete rest.end;
        delete rest.allDay;
        applyProposedUpdate(
          {
            event: merged,
            occurrence: null,
            start: merged.start,
            end: merged.end,
            allDay: merged.allDay ?? false,
            source: "api",
          },
          rest,
        );
        return;
      }
      if (timingChanged) {
        remapSelectionKey(
          id,
          `${id}::${event.start.toISOString()}`,
          merged.start,
        );
      }
      setField(
        "events",
        getState().events.map((e) => (e.id === id ? merged : e)),
      );
    },
    removeEvent(id) {
      setField(
        "events",
        getState().events.filter((event) => event.id !== id),
      );
    },
    getOccurrences(range) {
      if (!range) return getIndex().occurrences;
      const state = getState();
      const within =
        range.start >= state.visibleRange.start &&
        range.end <= state.visibleRange.end;
      if (within) {
        return getIndex().occurrences.filter((occ) =>
          eventsOverlap(occ, range),
        );
      }
      const rangeKey = getRangeKey(range);
      if (
        rangeCache &&
        rangeCache.events === state.events &&
        rangeCache.rangeKey === rangeKey &&
        rangeCache.timeZone === settings.timeZone &&
        rangeCache.weekStartsOn === settings.weekStartsOn &&
        rangeCache.eventOrder === settings.eventOrder &&
        rangeCache.getOccurrences === settings.getOccurrences
      ) {
        return rangeCache.occurrences;
      }
      const { occurrences } = buildCalendarIndex(state.events, range, {
        timeZone: settings.timeZone,
        weekStartsOn: settings.weekStartsOn,
        eventOrder: settings.eventOrder,
        getOccurrences: settings.getOccurrences,
      });
      rangeCache = {
        events: state.events,
        rangeKey,
        timeZone: settings.timeZone,
        weekStartsOn: settings.weekStartsOn,
        eventOrder: settings.eventOrder,
        getOccurrences: settings.getOccurrences,
        occurrences,
      };
      return occurrences;
    },
    getOccurrencesForDay(day) {
      const bucket = getIndex().byDay.get(getDayKey(day, settings.timeZone));
      if (!bucket) return [];
      const seen = new Set<string>();
      const result: CalendarOccurrence<TData>[] = [];
      for (const seg of [...bucket.allDay, ...bucket.timed]) {
        if (seen.has(seg.occurrence.key)) continue;
        seen.add(seg.occurrence.key);
        result.push(seg.occurrence);
      }
      return result;
    },
    findOverlapping({ start, end, excludeEventId }) {
      return api
        .getOccurrences({ start, end })
        .filter((occ) => occ.eventId !== excludeEventId);
    },
    select(partial) {
      const current = getState().selection;
      setField("selection", {
        eventKeys: partial.eventKeys ?? current.eventKeys,
        slot: partial.slot !== undefined ? partial.slot : current.slot,
      });
    },
    selectEvent(key, opts) {
      const current = getState().selection;
      const eventKeys = opts?.additive
        ? current.eventKeys.includes(key)
          ? current.eventKeys.filter((k) => k !== key)
          : [...current.eventKeys, key]
        : [key];
      setField("selection", { ...current, eventKeys });
    },
    clearSelection() {
      setField("selection", EMPTY_SELECTION);
    },
    setInteractions(patch) {
      setField("interactions", { ...getState().interactions, ...patch });
    },
    setViewSettings(patch) {
      setField("viewSettings", { ...getState().viewSettings, ...patch });
    },
    getVisibleRange() {
      return getState().visibleRange;
    },
    getActiveRange() {
      return getState().activeRange;
    },
    toZoned(date) {
      return toZoned(date, settings.timeZone);
    },
    scrollToTime(time) {
      scrollHandler?.(time);
    },
  };

  const internals: CalendarInternals<TData> = {
    getIndex,
    setDrag(drag) {
      internal.drag = drag;
      invalidate();
      notify();
    },
    setSlotDraft(draft) {
      internal.slotDraft = draft;
      invalidate();
      notify();
    },
    registerScrollHandler(handler) {
      scrollHandler = handler;
    },
    applyProposedUpdate,
    getSettingsVersion() {
      return settingsVersion;
    },
    getRootEl() {
      return rootEl;
    },
    setRootEl(el) {
      rootEl = el;
    },
  };

  const instance: CalendarInstance<TData> = {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    api,
    get settings() {
      return settings;
    },
    internals,
  };

  const STATE_KEYS = [
    "events",
    "view",
    "date",
    "dayCount",
    "selection",
    "interactions",
    "viewSettings",
    "loading",
  ] as const;
  const SETTINGS_KEYS = [
    "timeZone",
    "locale",
    "weekStartsOn",
    "views",
    "dayStartHour",
    "dayEndHour",
    "slotDuration",
    "snapDuration",
    "agendaDayCount",
    "fixedWeeks",
    "showOutsideDays",
    "i18n",
    "resources",
    "getEventPriority",
    "eventOrder",
    "getOccurrences",
    "weekendDays",
    "activation",
  ] as const;

  return {
    instance,
    setOptions(next) {
      const prev = options;
      options = next;
      let changed = false;
      for (const key of STATE_KEYS) {
        if (prev[key] !== next[key]) {
          changed = true;
          break;
        }
      }
      let settingsChanged = false;
      for (const key of SETTINGS_KEYS) {
        if (prev[key] !== next[key]) {
          settingsChanged = true;
          break;
        }
      }
      settings = resolveSettings(next);
      if (settingsChanged) {
        settingsVersion++;
        changed = true;
      }
      if (changed) invalidate();
      return changed;
    },
    notify,
    emitRangeIfChanged,
  };
}

/**
 * Headless root hook - the full calendar engine without any markup.
 * Pass the returned instance to <Calendar calendar={instance}> or drive
 * fully custom UI from instance.getState()/subscribe/api.
 */
function useCalendarState<TData = unknown>(
  options: UseCalendarStateOptions<TData> = {},
): CalendarInstance<TData> {
  const [store] = useState(() => createCalendarStore<TData>(options));
  const changed = store.setOptions(options);
  const changedRef = useRef(false);
  if (changed) changedRef.current = true;
  useLayoutEffect(() => {
    if (changedRef.current) {
      changedRef.current = false;
      store.notify();
    }
  });
  useEffect(() => {
    store.emitRangeIfChanged();
    // mount-only: onRangeChange fires once for the initial range
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return store.instance;
}

const CalendarContext =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createContext<CalendarInstance<any> | null>(null);

/** The stable calendar instance; throws outside <Calendar>. */
function useCalendar<TData = unknown>(): CalendarInstance<TData> {
  const instance = useContext(CalendarContext);
  if (!instance) {
    throw new Error("useCalendar must be used within <Calendar>");
  }
  return instance as CalendarInstance<TData>;
}

interface UseCalendarSelectorOptions<TData, TSelected> {
  calendar?: CalendarInstance<TData>;
  isEqual?: (a: TSelected, b: TSelected) => boolean;
}

/** Fine-grained subscription with equality memoization (Object.is default). */
function useCalendarSelector<TData = unknown, TSelected = unknown>(
  selector: (state: CalendarState<TData>) => TSelected,
  options?: UseCalendarSelectorOptions<TData, TSelected>,
): TSelected {
  const contextInstance = useContext(CalendarContext);
  const instance = options?.calendar ?? contextInstance;
  if (!instance) {
    throw new Error(
      "useCalendarSelector needs an <Calendar> ancestor or an explicit `calendar` option",
    );
  }
  const isEqual = options?.isEqual ?? Object.is;
  const lastRef = useRef<{ value: TSelected } | null>(null);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = () => {
    const next = selectorRef.current(
      instance.getState() as CalendarState<TData>,
    );
    if (lastRef.current && isEqual(lastRef.current.value, next)) {
      return lastRef.current.value;
    }
    lastRef.current = { value: next };
    return next;
  };

  return useSyncExternalStore(instance.subscribe, getSnapshot, getSnapshot);
}

function useCalendarView(): {
  view: CalendarView;
  dayCount: number;
  /** The resolved `views` option from settings. */
  availableViews: CalendarView[];
  setView: (view: CalendarView, opts?: { dayCount?: number }) => void;
} {
  const instance = useCalendar();
  const view = useCalendarSelector((state) => state.view);
  const dayCount = useCalendarSelector((state) => state.dayCount);
  useCalendarSettingsVersion(instance);
  return {
    view,
    dayCount,
    availableViews: instance.settings.views,
    setView: instance.api.setView,
  };
}

/**
 * isToday is a wall-clock read, so no store write ever invalidates it and a
 * calendar left open overnight keeps highlighting yesterday. One timer per
 * display zone, armed for the next zoned midnight and re-armed on fire, wakes
 * every day-scoped hook exactly when the answer changes; an interval would
 * tick thousands of times a day to catch one transition.
 */
const midnightTicker = (() => {
  const zones = new Map<
    string,
    { listeners: Set<() => void>; timer: ReturnType<typeof setTimeout> | null }
  >();
  let version = 0;

  const arm = (timeZone: string) => {
    const entry = zones.get(timeZone);
    if (!entry) return;
    const now = new Date();
    const next = zonedStartOfDay(
      addDays(toZoned(now, timeZone), 1),
      timeZone,
    ).getTime();
    entry.timer = setTimeout(
      () => {
        version++;
        entry.listeners.forEach((listener) => listener());
        arm(timeZone);
      },
      Math.max(1000, next - now.getTime()),
    );
  };

  return {
    subscribe(timeZone: string, listener: () => void) {
      let entry = zones.get(timeZone);
      if (!entry) {
        entry = { listeners: new Set(), timer: null };
        zones.set(timeZone, entry);
        entry.listeners.add(listener);
        arm(timeZone);
      } else {
        entry.listeners.add(listener);
      }
      const current = entry;
      return () => {
        current.listeners.delete(listener);
        if (current.listeners.size > 0) return;
        if (current.timer) clearTimeout(current.timer);
        zones.delete(timeZone);
      };
    },
    getVersion: () => version,
  };
})();

/** Re-renders the caller on the next midnight in `timeZone`. */
function useMidnightTick(timeZone: string): number {
  const subscribe = useCallback(
    (listener: () => void) => midnightTicker.subscribe(timeZone, listener),
    [timeZone],
  );
  return useSyncExternalStore(
    subscribe,
    midnightTicker.getVersion,
    midnightTicker.getVersion,
  );
}

function useCalendarNavigation(): {
  date: Date;
  /** i18n.functions.formatTitle output for the current view. */
  title: string;
  visibleRange: CalendarDateRange;
  activeRange: CalendarDateRange;
  next: () => void;
  prev: () => void;
  today: () => void;
  goTo: (date: Date) => void;
  /** True when the anchor period contains now in the display time zone. */
  isToday: boolean;
} {
  const instance = useCalendar();
  const { settings } = instance;
  const slice = useCalendarSelector(
    (state) => ({
      date: state.date,
      view: state.view,
      visibleRange: state.visibleRange,
      activeRange: state.activeRange,
    }),
    {
      isEqual: (a, b) =>
        a.date.getTime() === b.date.getTime() &&
        a.view === b.view &&
        getRangeKey(a.visibleRange) === getRangeKey(b.visibleRange),
    },
  );
  useCalendarSettingsVersion(instance);
  useMidnightTick(settings.timeZone);
  const now = new Date();
  return {
    date: slice.date,
    title: settings.i18n.functions.formatTitle(slice.view, {
      date: toZoned(slice.date, settings.timeZone),
      activeRange: slice.activeRange,
      visibleRange: slice.visibleRange,
      locale: settings.locale,
    }),
    visibleRange: slice.visibleRange,
    activeRange: slice.activeRange,
    next: instance.api.next,
    prev: instance.api.prev,
    today: instance.api.today,
    goTo: instance.api.goTo,
    isToday: now >= slice.activeRange.start && now < slice.activeRange.end,
  };
}

function useCalendarSelection(): {
  selection: CalendarSelection;
  select: (selection: Partial<CalendarSelection>) => void;
  selectEvent: (key: string, opts?: { additive?: boolean }) => void;
  clearSelection: () => void;
} {
  const instance = useCalendar();
  const selection = useCalendarSelector((state) => state.selection);
  return {
    selection,
    select: instance.api.select,
    selectEvent: instance.api.selectEvent,
    clearSelection: instance.api.clearSelection,
  };
}

function useCalendarInteractions(): {
  interactions: CalendarInteractions;
  setInteractions: (patch: Partial<CalendarInteractions>) => void;
} {
  const instance = useCalendar();
  const interactions = useCalendarSelector((state) => state.interactions);
  return { interactions, setInteractions: instance.api.setInteractions };
}

/** Expanded, sorted occurrences; defaults to the visible range. */
function useCalendarOccurrences<TData = unknown>(
  range?: CalendarDateRange,
): CalendarOccurrence<TData>[] {
  const instance = useCalendar<TData>();
  return useCalendarSelector<TData, CalendarOccurrence<TData>[]>(
    () => instance.api.getOccurrences(range),
    {
      calendar: instance,
      // element identity, not keys: keys encode id+start only, so an end-only
      // resize or a title/color/data edit would never invalidate a key-based
      // memo. The index rebuilds occurrence objects precisely when events
      // change, so identity is the correct (and cheapest) change signal.
      isEqual: (a, b) =>
        a === b || (a.length === b.length && a.every((occ, i) => occ === b[i])),
    },
  );
}

const EMPTY_BUCKET: CalendarDayBucket = { allDay: [], timed: [] };

/** Per-cell subscription: only cells whose segments changed re-render. */
function useCalendarDay<TData = unknown>(
  day: Date,
): {
  segments: CalendarDayBucket<TData>;
  isToday: boolean;
  isOutside: boolean;
} {
  const instance = useCalendar<TData>();
  const { timeZone } = instance.settings;
  const dayKey = getDayKey(day, timeZone);

  const bucket = useCalendarSelector<TData, CalendarDayBucket<TData>>(
    () =>
      instance.internals.getIndex().byDay.get(dayKey) ??
      (EMPTY_BUCKET as CalendarDayBucket<TData>),
    {
      calendar: instance,
      // Element identity, not a content key: an occurrence key encodes
      // id+start only, so a title/color/data edit produced an identical key
      // and this cell kept serving its STALE segments. Buckets come straight
      // out of the memoized index, which rebuilds precisely when events
      // change, so identity is both correct and the cheapest signal.
      isEqual: (a, b) =>
        a === b ||
        (a.allDay.length === b.allDay.length &&
          a.timed.length === b.timed.length &&
          a.allDay.every((segment, i) => segment === b.allDay[i]) &&
          a.timed.every((segment, i) => segment === b.timed[i])),
    },
  );
  const activeRange = useCalendarSelector<TData, CalendarDateRange>(
    (state) => state.activeRange,
    {
      calendar: instance,
      isEqual: (a, b) => getRangeKey(a) === getRangeKey(b),
    },
  );
  useMidnightTick(timeZone);
  const dayStart = zonedStartOfDay(day, timeZone);
  return {
    segments: bucket,
    isToday: getDayKey(new Date(), timeZone) === dayKey,
    isOutside: dayStart < activeRange.start || dayStart >= activeRange.end,
  };
}

const EMPTY_BARS: CalendarSegment[] = [];

/**
 * Per-week-row subscription for the month view: the laned multi-day/all-day
 * bar segments (one per occurrence per row, colStart/colSpan/lane set) that
 * render as continuous cross-day bars. `laneCount` is the row's bar height.
 * Matched by CONTAINMENT - any day inside the row resolves it - so a
 * weekends-hidden month (first visible day Monday) still finds its row;
 * `rowStart` returns the row's TRUE start for colStart/colSpan day math.
 */
function useCalendarWeek<TData = unknown>(
  day: Date,
): {
  bars: CalendarSegment<TData>[];
  laneCount: number;
  rowStart: Date | null;
} {
  const instance = useCalendar<TData>();
  const { timeZone } = instance.settings;
  const dayStartMs = zonedStartOfDay(day, timeZone).getTime();

  const row = useCalendarSelector<
    TData,
    { bars: CalendarSegment<TData>[]; rowStart: Date | null }
  >(
    () => {
      const index = instance.internals.getIndex();
      const match = index.weekRows.find((r) => {
        const startMs = zonedStartOfDay(r.rowStart, timeZone).getTime();
        // calendar-aware row end: a fixed 168h window would let the first
        // day AFTER a spring-forward week (167h long) match the wrong row
        const endMs = zonedStartOfDay(
          addDays(toZoned(r.rowStart, timeZone), 7),
          timeZone,
        ).getTime();
        return dayStartMs >= startMs && dayStartMs < endMs;
      });
      return {
        bars: match?.bars ?? (EMPTY_BARS as CalendarSegment<TData>[]),
        rowStart: match?.rowStart ?? null,
      };
    },
    {
      calendar: instance,
      // Same reasoning as the day bucket above: `bars` is the array held by
      // the memoized index, so element identity catches content edits that a
      // key built from id+start could never see.
      isEqual: (a, b) =>
        (a.rowStart?.getTime() ?? 0) === (b.rowStart?.getTime() ?? 0) &&
        (a.bars === b.bars ||
          (a.bars.length === b.bars.length &&
            a.bars.every((segment, i) => segment === b.bars[i]))),
    },
  );
  const laneCount = row.bars.reduce(
    (m, s) => Math.max(m, (s.lane ?? 0) + 1),
    0,
  );
  return { bars: row.bars, laneCount, rowStart: row.rowStart };
}

/**
 * User view settings (weekends, week numbers, now line, off days, schedule
 * hint) + the effective values after falling back to the root view-config
 * props. Drives the nav submenu; fully controllable from outside via
 * `viewSettings`/`onViewSettingsChange` or api.setViewSettings.
 */
function useCalendarViewSettings(): {
  viewSettings: CalendarViewSettings;
  setViewSettings: (patch: CalendarViewSettings) => void;
  effective: Required<CalendarViewSettings>;
} {
  const instance = useCalendar();
  const viewConfig = useCalendarViewConfig();
  const viewSettings = useCalendarSelector((state) => state.viewSettings);
  return {
    viewSettings,
    setViewSettings: instance.api.setViewSettings,
    effective: {
      weekends: viewSettings.weekends ?? true,
      weekNumbers: viewSettings.weekNumbers ?? viewConfig.showWeekNumbers,
      nowIndicator: viewSettings.nowIndicator ?? viewConfig.nowIndicator,
      offDays:
        viewSettings.offDays ??
        (viewConfig.offDays !== undefined && viewConfig.offDays !== false),
    },
  };
}

/** Subscribes to settings changes only (version counter, not state). */
function useCalendarSettingsVersion<TData>(
  instance: CalendarInstance<TData>,
): number {
  return useSyncExternalStore(
    instance.subscribe,
    instance.internals.getSettingsVersion,
    instance.internals.getSettingsVersion,
  );
}

/** Resolved settings incl. merged i18n; re-renders only when settings change. */
function useCalendarSettings<TData = unknown>(): CalendarSettings<TData> {
  const instance = useCalendar<TData>();
  useCalendarSettingsVersion(instance);
  return instance.settings;
}

const CalendarViewContext = createContext<{ view: CalendarView } | null>(null);

/**
 * Per-element class hooks, cn()-merged AFTER the built-in classes (so tailwind
 * variants and ! overrides win). Metric CSS variables can ride on any parent
 * key, e.g. classNames.timeGrid: "[--cal-gutter-width:4.5rem]".
 */
interface CalendarClassNames {
  nav?: string;
  toolbar?: string;
  content?: string;
  monthView?: string;
  monthCell?: string;
  timeGrid?: string;
  timeGutter?: string;
  dayColumn?: string;
  allDaySection?: string;
  agendaView?: string;
  event?: string;
  /** The styled hover tooltip popup (viewConfig.eventTooltip). */
  eventTooltip?: string;
  moreIndicator?: string;
  /** The "+N more" popover panel. Control the on-demand scroll cap through
   *  the CSS variable, e.g. "[--cal-more-max-height:20rem]". */
  morePopover?: string;
  /** "+N more" popover day header row. */
  morePopoverHeader?: string;
  // nav family (reachable without recomposing the default nav)
  navButton?: string;
  title?: string;
  navTooltip?: string;
  viewSwitcherContent?: string;
  viewSwitcherLabel?: string;
  viewShortcut?: string;
  datePickerContent?: string;
  // month view
  monthHeader?: string;
  monthDayHeader?: string;
  monthBody?: string;
  monthRow?: string;
  weekNumber?: string;
  monthBarOverlay?: string;
  monthBar?: string;
  monthCellContent?: string;
  monthCellFooter?: string;
  monthDayNumber?: string;
  dayAddButton?: string;
  // time grid / resource
  timeGridHeader?: string;
  timeGutterLabel?: string;
  allDayLabel?: string;
  allDayCell?: string;
  timedChip?: string;
  resourceHeader?: string;
  // interaction surfaces (shared by every view)
  dragGhost?: string;
  dragCarry?: string;
  dragCarryInvalid?: string;
  dropHint?: string;
  dropIndicator?: string;
  slotDraft?: string;
  resizeHandle?: string;
  resizeGrip?: string;
  // agenda
  noEvents?: string;
  agendaDay?: string;
  agendaDayHeader?: string;
  agendaDayGutter?: string;
  agendaDate?: string;
  agendaDayToggle?: string;
  agendaDayContent?: string;
  agendaItem?: string;
  agendaItemSurface?: string;
  agendaItemToggle?: string;
  agendaDaySummary?: string;
  agendaSummaryDot?: string;
}

interface CalendarRenderEventProps<TData = unknown> {
  occurrence: CalendarOccurrence<TData>;
  segment: CalendarSegment<TData>;
  view: CalendarView;
  isDragging: boolean;
  isSelected: boolean;
}

/**
 * View-layer configuration: display props and render overrides. These live on
 * <Calendar> (and per-view components), never in the headless options.
 */
interface CalendarViewConfig<TData = unknown> {
  scrollToHour: number;
  nowIndicator: boolean;
  /**
   * Grid interval in minutes for the time-based views (day, week, N-days,
   * time grid): gutter slots and gridlines follow it. Also accepted as a
   * prop on each view component.
   */
  interval: number;
  maxEventsPerCell: number | "auto";
  showWeekNumbers: boolean;
  enableShortcuts: boolean;
  shortcutsScope: "focus-within" | "global";
  /**
   * "contained" (default): the calendar fills its container and views scroll
   * internally. "page": content flows with the document, the page scrolls,
   * and day headers stick below `--cal-sticky-offset` (default 0px).
   */
  scrollMode: "contained" | "page";
  /** Stick the default nav to the top while the page scrolls. */
  stickyNav: boolean;
  /**
   * Custom per-day indication (light background classes work in both themes,
   * e.g. "bg-amber-500/10"). Applied to month cells, time-grid day columns,
   * and all-day cells; content stays readable on top of it.
   */
  dayClassName?: (day: Date) => string | undefined;
  /**
   * Extra classes for the CURRENT day, appended after the built-in highlight
   * (primary-tinted background + accent top border) on month cells, time-grid
   * day columns, and day headers.
   */
  todayClassName?: string;
  /**
   * Show a hover "+" add affordance on month cells next to the day number.
   * It fires the same onSlotClick as clicking the day. Calendar-level config
   * (consistent affordance, wired to the create flow); use renderMonthCell
   * when a fully custom cell is needed instead.
   */
  showDayAddButton: boolean;
  /**
   * Scroll implementation for every internally scrolling surface (time grid,
   * agenda, time-grid resources, month "+N more" popover):
   * "custom" (default, shadcn ScrollArea) or "native" (browser scrollbars
   * via overflow auto).
   */
  scrollbars: "custom" | "native";
  /** Nav button variant; all nav buttons follow it. Default "ghost". */
  navButtonVariant: "ghost" | "outline" | "secondary" | "default";
  /** Nav button size; icon buttons use the icon twin. Default "sm". */
  navButtonSize: "sm" | "default";
  /**
   * Off-day (non-working day) marking. true = weekends with a muted
   * background; a config object customizes weekdays, explicit dates, a
   * predicate, and the marker class. Marked cells carry data-off.
   */
  offDays?: boolean | CalendarOffDaysConfig;
  classNames?: CalendarClassNames;
  components?: Partial<Record<CalendarView, ComponentType>>;
  renderEvent?: (props: CalendarRenderEventProps<TData>) => ReactNode;
  renderAgendaEvent?: (props: CalendarRenderEventProps<TData>) => ReactNode;
  /**
   * Content for the styled hover tooltip (viewConfig.eventTooltip). Return a
   * falsy value (null / undefined, or the `false` a `cond && <node>` yields)
   * to fall back to the default label (title + time); `label` itself is
   * undefined when a consumer i18n.formatEventLabel opts out.
   */
  renderEventTooltip?: (props: {
    occurrence: CalendarOccurrence<TData>;
    segment: CalendarSegment<TData>;
    view: CalendarView;
    label: string | undefined;
  }) => ReactNode;
  renderDragPreview?: (props: { drag: CalendarDragState<TData> }) => ReactNode;
  renderMonthCell?: (props: {
    day: Date;
    segments: CalendarDayBucket<TData>;
    isToday: boolean;
    isOutside: boolean;
    overflowCount: number;
    defaultContent: ReactNode;
  }) => ReactNode;
  /**
   * Time-grid business-logic layer, rendered pointer-events-none BEHIND event
   * segments in each day column. Position overlays with
   * top/height: calc(var(--cal-hour-height) * minutes / 60).
   */
  renderDayColumnBackground?: (props: {
    day: Date;
    boundsStartMin: number;
    boundsEndMin: number;
    totalMinutes: number;
  }) => ReactNode;
  renderDayHeader?: (props: {
    day: Date;
    view: CalendarView;
    isToday: boolean;
  }) => ReactNode;
  renderTimeGutterSlot?: (props: {
    time: Date;
    hour: number;
    minute: number;
  }) => ReactNode;
  renderAllDaySection?: (props: {
    days: Date[];
    segments: CalendarSegment<TData>[];
  }) => ReactNode;
  renderMoreIndicator?: (props: {
    day: Date;
    count: number;
    segments: CalendarSegment<TData>[];
  }) => ReactNode;
  /**
   * Replaces the ENTIRE body of the built-in "+N more" popover (header +
   * chip list) while keeping its trigger and positioning; `close` dismisses
   * it. For a fully custom surface, return false from onMoreClick instead
   * and open your own UI.
   */
  renderMoreContent?: (props: {
    day: Date;
    segments: CalendarSegment<TData>[];
    close: () => void;
  }) => ReactNode;
  /**
   * Agenda-only expandable details. When it returns a node for an occurrence,
   * the agenda row gains an expand/collapse toggle revealing the details
   * below the chip (the calendar itself never knows the consumer's fields).
   */
  renderAgendaEventDetails?: (
    occurrence: CalendarOccurrence<TData>,
  ) => ReactNode;
  renderNowIndicator?: (props: { time: Date }) => ReactNode;
  renderNoEvents?: () => ReactNode;
  /** Resource column header cell content; default is resource.title. */
  renderResourceHeader?: (props: { resource: CalendarResource }) => ReactNode;
  /** Agenda date gutter (day badge + weekday + collapse toggle). */
  renderAgendaDayHeader?: (props: {
    day: Date;
    collapsed: boolean;
    count: number;
    toggle: () => void;
    defaultContent: ReactNode;
  }) => ReactNode;
  /** Collapsed agenda day summary row content. */
  renderAgendaDaySummary?: (props: {
    day: Date;
    occurrences: CalendarOccurrence<TData>[];
    count: number;
    expand: () => void;
    defaultContent: ReactNode;
  }) => ReactNode;
  /**
   * N-day presets offered by the view switcher when the "days" view is
   * enabled. @default [5]
   */
  dayCountPresets: number[];
  /**
   * Nav tooltips: false disables them all; an object tunes placement and
   * timings. @default { side: "bottom", delay: 600, closeDelay: 0, timeout: 300 }
   */
  navTooltips?:
    | false
    | {
        side?: "top" | "bottom" | "left" | "right";
        delay?: number;
        closeDelay?: number;
        timeout?: number;
      };
  /**
   * Styled tooltip on event hover / keyboard focus. `false` (default) keeps
   * only the native title attribute; `true` shows the standard Tooltip with
   * the event label; an object also tunes the side and open delay. Content is
   * overridable with renderEventTooltip. @default false
   */
  eventTooltip?:
    | boolean
    | {
        side?: "top" | "bottom" | "left" | "right";
        delay?: number;
      };
  /**
   * Timed events shorter than this render the compact single-row chip layout.
   * @default 45
   */
  compactEventMinutes: number;
  /** "+N more" popover alignment against its trigger. @default "start" */
  morePopoverAlign: "start" | "center" | "end";
  /** Now-indicator refresh cadence in milliseconds. @default 30000 */
  nowIndicatorInterval: number;
  /** Max color dots in a collapsed agenda day summary. @default 6 */
  agendaSummaryMaxDots: number;
}

const DEFAULT_VIEW_CONFIG: CalendarViewConfig = {
  scrollToHour: 7,
  nowIndicator: true,
  interval: 60,
  maxEventsPerCell: "auto",
  showWeekNumbers: false,
  enableShortcuts: true,
  shortcutsScope: "focus-within",
  scrollMode: "contained",
  stickyNav: false,
  showDayAddButton: false,
  scrollbars: "custom",
  navButtonVariant: "ghost",
  navButtonSize: "sm",
  dayCountPresets: [5],
  eventTooltip: false,
  compactEventMinutes: 45,
  morePopoverAlign: "start",
  nowIndicatorInterval: 30_000,
  agendaSummaryMaxDots: 6,
};

const CalendarViewConfigContext =
  createContext<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CalendarViewConfig<any>
  >(DEFAULT_VIEW_CONFIG);

/** Root-level display props + render overrides, for view components. */
function useCalendarViewConfig<TData = unknown>(): CalendarViewConfig<TData> {
  return useContext(CalendarViewConfigContext);
}

const VIEW_CONFIG_KEYS: Array<keyof CalendarViewConfig> = [
  "scrollToHour",
  "nowIndicator",
  "interval",
  "maxEventsPerCell",
  "showWeekNumbers",
  "enableShortcuts",
  "shortcutsScope",
  "scrollMode",
  "stickyNav",
  "dayClassName",
  "todayClassName",
  "showDayAddButton",
  "scrollbars",
  "navButtonVariant",
  "navButtonSize",
  "offDays",
  "classNames",
  "components",
  "renderEvent",
  "renderAgendaEvent",
  "renderEventTooltip",
  "renderDragPreview",
  "renderMonthCell",
  "renderDayColumnBackground",
  "renderDayHeader",
  "renderTimeGutterSlot",
  "renderAllDaySection",
  "renderMoreIndicator",
  "renderMoreContent",
  "renderNowIndicator",
  "renderNoEvents",
  "renderAgendaEventDetails",
  "renderResourceHeader",
  "renderAgendaDayHeader",
  "renderAgendaDaySummary",
  "dayCountPresets",
  "navTooltips",
  "eventTooltip",
  "compactEventMinutes",
  "morePopoverAlign",
  "nowIndicatorInterval",
  "agendaSummaryMaxDots",
];

/** The rendering view of the nearest view component ("month", "week", ...). */
function useCalendarViewContext(): { view: CalendarView } {
  const ctx = useContext(CalendarViewContext);
  if (!ctx) {
    throw new Error(
      "useCalendarViewContext must be used inside a calendar view",
    );
  }
  return ctx;
}

interface CalendarProps<TData = unknown>
  extends UseCalendarStateOptions<TData>,
    Partial<CalendarViewConfig<TData>>,
    Omit<useRender.ComponentProps<"div">, "children" | "defaultValue"> {
  /** Adopt a hoisted useCalendarState instance; option props are then ignored. */
  calendar?: CalendarInstance<TData>;
  /** Imperative escape hatch usable from outside the tree. */
  apiRef?: RefObject<CalendarApi<TData> | null>;
  children?: ReactNode;
}

const OPTION_KEYS: Array<keyof UseCalendarStateOptions> = [
  "events",
  "defaultEvents",
  "view",
  "defaultView",
  "date",
  "defaultDate",
  "dayCount",
  "defaultDayCount",
  "selection",
  "defaultSelection",
  "interactions",
  "defaultInteractions",
  "viewSettings",
  "defaultViewSettings",
  "loading",
  "views",
  "timeZone",
  "locale",
  "weekStartsOn",
  "dayStartHour",
  "dayEndHour",
  "slotDuration",
  "snapDuration",
  "agendaDayCount",
  "fixedWeeks",
  "showOutsideDays",
  "i18n",
  "resources",
  "getEventPriority",
  "eventOrder",
  "getOccurrences",
  "weekendDays",
  "activation",
  "onEventClick",
  "onEventDoubleClick",
  "onEventUpdate",
  "canDropEvent",
  "onDragBlocked",
  "onSlotClick",
  "onSelectSlot",
  "canSelectSlot",
  "onRangeChange",
  "onViewChange",
  "onDateChange",
  "onDayCountChange",
  "onSelectionChange",
  "onInteractionsChange",
  "onViewSettingsChange",
  "onEventsChange",
  "onMoreClick",
];

function splitOptions<TData>(props: Record<string, unknown>): {
  options: UseCalendarStateOptions<TData>;
  viewConfig: CalendarViewConfig<TData>;
  rest: Record<string, unknown>;
} {
  const options: Record<string, unknown> = {};
  const viewConfig: Record<string, unknown> = { ...DEFAULT_VIEW_CONFIG };
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if ((OPTION_KEYS as string[]).includes(key)) options[key] = value;
    else if ((VIEW_CONFIG_KEYS as string[]).includes(key)) {
      if (value !== undefined) viewConfig[key] = value;
    } else rest[key] = value;
  }
  return {
    options: options as UseCalendarStateOptions<TData>,
    viewConfig: viewConfig as unknown as CalendarViewConfig<TData>,
    rest,
  };
}

/**
 * Root provider + container. Composition contract:
 * <Calendar><CalendarNav/><CalendarToolbar/><CalendarContent/></Calendar>
 */
function Calendar<TData = unknown>({
  calendar,
  apiRef,
  className,
  render,
  children,
  ...props
}: CalendarProps<TData>) {
  const { options, viewConfig, rest } = splitOptions<TData>(
    props as Record<string, unknown>,
  );

  if (calendar && Object.keys(options).length > 0) {
    warnOnce(
      "calendar-and-options",
      "both `calendar` and option props were passed; option props are ignored when adopting an instance.",
    );
  }

  const own = useCalendarState<TData>(calendar ? {} : options);
  const instance = calendar ?? own;

  useEffect(() => {
    if (apiRef) apiRef.current = instance.api;
  }, [apiRef, instance]);

  // Register the root element so the drag engine can find day cells even when a
  // gesture starts from a portaled surface (the "+N more" popover).
  const registerRoot = useCallback(
    (el: HTMLElement | null) => instance.internals.setRootEl(el),
    [instance],
  );

  const defaultProps = {
    "data-slot": "calendar",
    ref: registerRoot,
    // text-xs is the calendar-wide default type size; because it sits before
    // `className`, a consumer can override the whole scale with e.g.
    // <Calendar className="text-sm"> and every inheriting element follows.
    // Inner elements omit their own text-size so they cascade from here (the
    // few portaled surfaces - "+N more" popover, drag carry clone - pin the
    // size explicitly since DOM inheritance does not cross a portal).
    className: cn("flex min-h-0 min-w-0 flex-col text-xs", className),
    children: (
      <>
        {children}
        <div
          data-slot="calendar-announcer"
          aria-live="polite"
          className="sr-only"
        />
      </>
    ),
  };

  return (
    <CalendarContext.Provider value={instance}>
      <CalendarViewConfigContext.Provider value={viewConfig}>
        {useRender({
          defaultTagName: "div",
          render,
          props: mergeProps<"div">(defaultProps, rest),
        })}
      </CalendarViewConfigContext.Provider>
    </CalendarContext.Provider>
  );
}

export type {
  CalendarActivationConfig,
  CalendarApi,
  CalendarCallbacks,
  CalendarClassNames,
  CalendarInstance,
  CalendarInternals,
  CalendarProps,
  CalendarRenderEventProps,
  CalendarSettings,
  CalendarViewConfig,
  UseCalendarStateOptions,
};
export {
  ALL_VIEWS,
  BASE_VIEWS,
  Calendar,
  CalendarContext,
  CalendarViewConfigContext,
  CalendarViewContext,
  DEFAULT_VIEW_CONFIG,
  useCalendar,
  useCalendarDay,
  useCalendarInteractions,
  useCalendarNavigation,
  useCalendarOccurrences,
  useCalendarSelection,
  useCalendarSelector,
  useCalendarSettings,
  useCalendarSettingsVersion,
  useCalendarState,
  useCalendarView,
  useCalendarViewConfig,
  useCalendarViewContext,
  useCalendarViewSettings,
  useCalendarWeek,
};
