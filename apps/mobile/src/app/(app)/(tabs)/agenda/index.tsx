import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { useFocusEffect, useRouter } from "expo-router";
import { Chip } from "heroui-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  type ScrollViewInstance,
  useWindowDimensions,
  View,
} from "react-native";

import { AppointmentList } from "@/components/agenda/appointment-list";
import {
  DAY_PILL_STRIDE,
  DAY_STRIP_PADDING,
  DayStrip,
} from "@/components/agenda/day-strip";
import { RescheduleRequests } from "@/components/agenda/reschedule-requests";
import { HeaderAction } from "@/components/header-action";
import { useAccess } from "@/hooks/use-access";
import {
  useDayAppointments,
  useRescheduleRequests,
  useShopMembers,
} from "@/hooks/use-appointments";
import type { Appointment } from "@/lib/appointments";
import { addDaysBogota, bogotaStartOfDay } from "@/lib/dates";

const DAYS_BEFORE = 7;
const DAYS_AFTER = 14;

export default function AgendaScreen() {
  const router = useRouter();
  const membership = useAccess()?.membership;
  const { width } = useWindowDimensions();
  const stripRef = useRef<ScrollViewInstance>(null);

  const [todayMs, setTodayMs] = useState(() => bogotaStartOfDay(new Date()));
  const [selectedMs, setSelectedMs] = useState(todayMs);

  // The screen can stay mounted across Bogotá midnight; re-anchor on focus.
  useFocusEffect(
    useCallback(() => {
      const now = bogotaStartOfDay(new Date());
      if (now !== todayMs) {
        setTodayMs(now);
        setSelectedMs(now);
      }
    }, [todayMs]),
  );
  const days = useMemo(
    () =>
      Array.from({ length: DAYS_BEFORE + 1 + DAYS_AFTER }, (_, index) =>
        addDaysBogota(todayMs, index - DAYS_BEFORE),
      ),
    [todayMs],
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

  const openAppointment = (appointment: Appointment) =>
    router.push({
      pathname: "/(app)/(tabs)/agenda/[appointmentId]",
      params: { appointmentId: appointment._id },
    });

  /** Scroll so today's pill sits in the middle of the strip. */
  const scrollToToday = (animated: boolean) => {
    const pillCenter =
      DAY_STRIP_PADDING + DAYS_BEFORE * DAY_PILL_STRIDE + DAY_PILL_STRIDE / 2;
    stripRef.current?.scrollTo({
      x: Math.max(0, pillCenter - width / 2),
      animated,
    });
  };

  return (
    <>
      <HeaderAction
        label="Hoy"
        icon="calendar.badge.clock"
        onPress={() => {
          setSelectedMs(todayMs);
          scrollToToday(true);
        }}
      />
      {/* The scrollable is the first view so content runs under the glass chrome. */}
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="border-border border-b pt-3 pb-3">
          <DayStrip
            ref={stripRef}
            days={days}
            todayMs={todayMs}
            selectedMs={selectedMs}
            onSelect={setSelectedMs}
            onLayout={() => scrollToToday(false)}
          />
          {showBarberFilter ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="pt-3"
              contentContainerStyle={{
                paddingHorizontal: DAY_STRIP_PADDING,
                gap: 8,
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
        </View>
        <RescheduleRequests requests={requests} onOpen={openAppointment} />
        <AppointmentList
          appointments={visibleAppointments}
          memberName={showBarber ? memberName : undefined}
          onOpen={openAppointment}
        />
      </ScrollView>
    </>
  );
}
