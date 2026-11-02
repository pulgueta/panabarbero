import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentType, ReactNode } from "react";
import {
  useCalendarSelector,
  useCalendarViewConfig,
} from "@/components/calendar/calendar";
import { CalendarAgendaView } from "@/components/calendar/calendar-agenda-view";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { CalendarResourceView } from "@/components/calendar/calendar-resource-view";
import {
  CalendarDaysView,
  CalendarDayView,
  CalendarWeekView,
} from "@/components/calendar/calendar-time-grid";
import type { CalendarView } from "@/components/calendar/calendar-types";

import { cn } from "@/lib/utils";

const DEFAULT_VIEW_COMPONENTS: Record<CalendarView, ComponentType> = {
  month: CalendarMonthView,
  week: CalendarWeekView,
  day: CalendarDayView,
  days: CalendarDaysView,
  agenda: CalendarAgendaView,
  resource: CalendarResourceView,
};

interface CalendarContentProps
  extends Omit<useRender.ComponentProps<"div">, "children"> {
  /** Swap individual view implementations. */
  components?: Partial<Record<CalendarView, ComponentType>>;
  /** Replaces the switchboard entirely; read useCalendarView() inside. */
  children?: ReactNode;
}

function CalendarContent({
  className,
  render,
  components,
  children,
  ...props
}: CalendarContentProps) {
  const viewConfig = useCalendarViewConfig();
  const view = useCalendarSelector((state) => state.view);
  const loading = useCalendarSelector((state) => state.loading);

  const resolved = {
    ...DEFAULT_VIEW_COMPONENTS,
    ...viewConfig.components,
    ...components,
  };
  // A spread copies keys that hold `undefined`, so `components={{ month: isPro
  // ? ProMonth : undefined }}` would erase the default and render <undefined />.
  const ActiveView = resolved[view] ?? DEFAULT_VIEW_COMPONENTS[view];

  const defaultProps = {
    "data-slot": "calendar-content",
    "data-view": view,
    "data-loading": loading || undefined,
    className: cn(
      "relative flex min-h-0 min-w-0 flex-1 flex-col",
      "data-loading:pointer-events-none data-loading:opacity-60",
      viewConfig.classNames?.content,
      className,
    ),
    children: children ?? <ActiveView />,
  };

  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(defaultProps, props),
  });
}

export type { CalendarContentProps };
export { CalendarContent, DEFAULT_VIEW_COMPONENTS };
