import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { useFocusEffect, useRouter } from "expo-router";
import { Chip, useToast } from "heroui-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CalendarHeader } from "@/components/agenda/calendar-header";
import {
  DayTimeline,
  type DayTimelineHandle,
} from "@/components/agenda/day-timeline";
import { RescheduleRequests } from "@/components/agenda/reschedule-requests";
import {
  type AgendaView,
  ViewSwitcher,
} from "@/components/agenda/view-switcher";
import { useAccess } from "@/hooks/use-access";
import {
  useDayAppointments,
  useRangeAppointments,
  useRescheduleRequests,
  useShopMembers,
} from "@/hooks/use-appointments";
import type { Appointment } from "@/lib/appointments";
import {
  addDaysBogota,
  bogotaStartOfDay,
  bogotaStartOfMonth,
  monthWeeks,
} from "@/lib/dates";

const DAY_MS = 24 * 60 * 60 * 1000;
/** The range query caps at 35 days; a 6-row grid loses dots on its last trailing days. */
const MAX_RANGE_DAYS = 35;

export default function AgendaScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const membership = useAccess()?.membership;
  const timelineRef = useRef<DayTimelineHandle>(null);

  const [todayMs, setTodayMs] = useState(() => bogotaStartOfDay(new Date()));
  const [selectedMs, setSelectedMs] = useState(todayMs);
  const [monthMs, setMonthMs] = useState(() => bogotaStartOfMonth(todayMs));
  const [selectedId, setSelectedId] = useState<Id<"appointments"> | null>(null);

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

  // Dots for the visible grid: from its first cell, capped to the query limit.
  const { rangeFrom, rangeTo } = useMemo(() => {
    const weeks = monthWeeks(monthMs);
    const first = weeks[0][0];
    const last = weeks[weeks.length - 1][6];
    const cappedLast = Math.min(last, addDaysBogota(first, MAX_RANGE_DAYS - 1));
    return { rangeFrom: first, rangeTo: cappedLast + DAY_MS - 1 };
  }, [monthMs]);
  const rangeRows = useRangeAppointments(
    membership?.barbershopId,
    rangeFrom,
    rangeTo,
  );
  const markedDays = useMemo(
    () =>
      new Set(
        rangeRows
          ?.filter(
            (row) =>
              barberFilter === "all" || row.barbershopMemberId === barberFilter,
          )
          .map((row) => bogotaStartOfDay(new Date(row.date))),
      ),
    [rangeRows, barberFilter],
  );

  const openAppointment = (appointment: Appointment) => {
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

  const changeView = (view: AgendaView) => {
    if (view !== "day") toast.show({ label: "Pronto" });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background">
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
          {showBarberFilter ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="max-h-11 shrink-0 grow-0"
              contentContainerStyle={{
                paddingHorizontal: 8,
                paddingTop: 8,
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
          <DayTimeline
            ref={timelineRef}
            appointments={visibleAppointments}
            isToday={selectedMs === todayMs}
            selectedId={selectedId}
            memberName={showBarber ? memberName : undefined}
            onOpen={openAppointment}
          />
          <ViewSwitcher value="day" onChange={changeView} />
        </View>
      </View>
    </SafeAreaView>
  );
}
