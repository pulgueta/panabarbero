import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/build/react-navigation/elements/index.js";
import { Chip, Typography } from "heroui-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CalendarHeader } from "@/components/agenda/calendar-header";
import {
  DayTimeline,
  type DayTimelineHandle,
} from "@/components/agenda/day-timeline";
import { MonthGrid } from "@/components/agenda/month-grid";
import { RescheduleRequests } from "@/components/agenda/reschedule-requests";
import {
  type AgendaView,
  getSessionView,
  setSessionView,
  ViewSwitcher,
} from "@/components/agenda/view-switcher";
import { WeekTimeline } from "@/components/agenda/week-timeline";
import { useAccess } from "@/hooks/use-access";
import {
  type RangeAppointment,
  useDayAppointments,
  useRangeAppointments,
  useRescheduleRequests,
  useShopMembers,
} from "@/hooks/use-appointments";
import {
  bogotaStartOfDay,
  bogotaStartOfMonth,
  formatDayLabel,
  monthGrid,
  monthWeeks,
  weekDays,
} from "@/lib/dates";

const DAY_MS = 24 * 60 * 60 * 1000;
const dayCaption = { fontSize: 11, lineHeight: 14 };

export default function AgendaScreen() {
  const router = useRouter();
  // The header is transparent, so the content starts under it.
  const headerHeight = useHeaderHeight();
  const membership = useAccess()?.membership;
  const timelineRef = useRef<DayTimelineHandle>(null);

  const [todayMs, setTodayMs] = useState(() => bogotaStartOfDay(new Date()));
  const [selectedMs, setSelectedMs] = useState(todayMs);
  const [monthMs, setMonthMs] = useState(() => bogotaStartOfMonth(todayMs));
  const [selectedId, setSelectedId] = useState<Id<"appointments"> | null>(null);
  const [view, setView] = useState<AgendaView>(getSessionView);

  // The screen can stay mounted across Bogotá midnight; re-anchor on focus.
  // Regaining focus also clears the block highlighted before a detail push.
  useFocusEffect(
    useCallback(() => {
      setSelectedId(null);
      const now = bogotaStartOfDay(new Date());
      if (now !== todayMs) {
        setTodayMs(now);
        setSelectedMs(now);
        setMonthMs(bogotaStartOfMonth(now));
      }
    }, [todayMs]),
  );

  // Barbers only get their own appointments, so the barber name is noise.
  const showBarber = !!membership && (membership.isOwner || membership.isStaff);
  const appointments = useDayAppointments(membership?.barbershopId, selectedMs);
  const { members, memberName } = useShopMembers(
    showBarber ? membership.barbershopId : undefined,
  );
  // Same as the web calendar: managers filter by barber when there are several.
  const [barberFilter, setBarberFilter] = useState<
    "all" | Id<"barbershopMembers">
  >("all");
  const showBarberFilter = showBarber && (members?.length ?? 0) > 1;
  const visibleAppointments =
    barberFilter === "all"
      ? appointments
      : appointments?.filter(
          (appointment) => appointment.barbershopMemberId === barberFilter,
        );
  // Owner and staff see every request; barbers only their own.
  const requests = useRescheduleRequests(
    membership?.barbershopId,
    showBarber ? undefined : membership?.memberId,
  );

  // Header dots and the month view share the 42-cell grid window.
  const gridDays = useMemo(() => monthGrid(monthMs), [monthMs]);
  const rangeRows = useRangeAppointments(
    membership?.barbershopId,
    gridDays[0],
    gridDays[41] + DAY_MS - 1,
  );
  // The week view reads its own 7 days: the selection can sit outside the visible month.
  const week = useMemo(() => weekDays(selectedMs), [selectedMs]);
  const weekRows = useRangeAppointments(
    view === "week" ? membership?.barbershopId : undefined,
    week[0],
    week[6] + DAY_MS - 1,
  );
  const byBarber = useCallback(
    (rows: RangeAppointment[] | undefined) =>
      barberFilter === "all"
        ? rows
        : rows?.filter((row) => row.barbershopMemberId === barberFilter),
    [barberFilter],
  );
  const visibleRangeRows = useMemo(
    () => byBarber(rangeRows),
    [byBarber, rangeRows],
  );
  const visibleWeekRows = useMemo(
    () => byBarber(weekRows),
    [byBarber, weekRows],
  );
  const markedDays = useMemo(
    () =>
      new Set(
        visibleRangeRows?.map((row) => bogotaStartOfDay(new Date(row.date))),
      ),
    [visibleRangeRows],
  );

  const openAppointment = (appointment: { _id: Id<"appointments"> }) => {
    setSelectedId(appointment._id);
    router.push({
      pathname: "/(app)/(tabs)/agenda/[appointmentId]",
      params: { appointmentId: appointment._id },
    });
  };

  const goToToday = () => {
    setSelectedMs(todayMs);
    setMonthMs(bogotaStartOfMonth(todayMs));
    timelineRef.current?.scrollToNow(true);
  };

  const changeView = (next: AgendaView) => {
    setSessionView(next);
    setView(next);
  };

  // The header strip follows the selection only inside its month grid; a
  // trailing cell of the 6-row month view moves the header to that month.
  const selectDay = (dayMs: number) => {
    setSelectedMs(dayMs);
    if (!monthWeeks(monthMs).some((row) => row.includes(dayMs))) {
      setMonthMs(bogotaStartOfMonth(dayMs));
    }
  };
  const openDay = (dayMs: number) => {
    selectDay(dayMs);
    changeView("day");
  };

  return (
    <View className="flex-1 bg-background">
      {/* Third-party views take no className: the safe area gets a plain style. */}
      <SafeAreaView
        edges={["bottom"]}
        style={{ flex: 1, paddingTop: headerHeight }}
      >
        <View className="mx-4 mt-2 mb-4 flex-1 rounded-[28px] bg-agenda-well p-2">
          <RescheduleRequests requests={requests} onOpen={openAppointment} />
          <CalendarHeader
            todayMs={todayMs}
            selectedMs={selectedMs}
            monthMs={monthMs}
            markedDays={markedDays}
            onSelect={setSelectedMs}
            onMonthChange={setMonthMs}
            onToday={goToToday}
          />
          <View className="flex-1 overflow-hidden rounded-[20px] bg-agenda-card">
            {/* The header can show another month: the selected day stays explicit here. */}
            <View className="flex-row items-center">
              {showBarberFilter ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="max-h-11 flex-1"
                  contentContainerStyle={{
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    gap: 6,
                  }}
                >
                  {[
                    { _id: "all" as const, name: "Todos los barberos" },
                    ...(members ?? []),
                  ].map((barber) => {
                    const isSelected = barber._id === barberFilter;
                    return (
                      <Chip
                        key={barber._id}
                        size="sm"
                        variant={isSelected ? "primary" : "secondary"}
                        color={isSelected ? "accent" : "default"}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setBarberFilter(barber._id)}
                      >
                        {barber.name}
                      </Chip>
                    );
                  })}
                </ScrollView>
              ) : null}
              <Typography
                color="muted"
                className="ml-auto shrink-0 px-3 py-2"
                style={dayCaption}
              >
                {formatDayLabel(selectedMs)}
              </Typography>
            </View>
            {view === "day" ? (
              <DayTimeline
                ref={timelineRef}
                dayMs={selectedMs}
                appointments={visibleAppointments}
                isToday={selectedMs === todayMs}
                selectedId={selectedId}
                memberName={showBarber ? memberName : undefined}
                onOpen={openAppointment}
              />
            ) : view === "week" ? (
              <WeekTimeline
                ref={timelineRef}
                days={week}
                todayMs={todayMs}
                selectedMs={selectedMs}
                appointments={visibleWeekRows}
                selectedId={selectedId}
                onSelectDay={selectDay}
                onOpen={openAppointment}
              />
            ) : (
              <MonthGrid
                monthMs={monthMs}
                todayMs={todayMs}
                selectedMs={selectedMs}
                appointments={visibleRangeRows}
                onSelectDay={selectDay}
                onOpenDay={openDay}
              />
            )}
            <ViewSwitcher value={view} onChange={changeView} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
