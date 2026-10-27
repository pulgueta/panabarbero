import { useFocusEffect, useRouter } from "expo-router";
import { Chip } from "heroui-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
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
import { ScreenHeader } from "@/components/screen-header";
import { useAccess } from "@/hooks/use-access";
import { useDayAppointments, useShopMembers } from "@/hooks/use-appointments";
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
  const { memberName } = useShopMembers(
    showBarber ? membership.barbershopId : undefined,
  );

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
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Agenda"
        action={
          <Chip
            size="sm"
            variant="soft"
            color="default"
            onPress={() => {
              setSelectedMs(todayMs);
              scrollToToday(true);
            }}
          >
            Hoy
          </Chip>
        }
      />
      <View className="border-border border-b pb-3">
        <DayStrip
          ref={stripRef}
          days={days}
          todayMs={todayMs}
          selectedMs={selectedMs}
          onSelect={setSelectedMs}
          onLayout={() => scrollToToday(false)}
        />
      </View>
      <View className="flex-1">
        <AppointmentList
          appointments={appointments}
          memberName={showBarber ? memberName : undefined}
          onOpen={(appointment) =>
            router.push({
              pathname: "/(app)/agenda/[appointmentId]",
              params: { appointmentId: appointment._id },
            })
          }
        />
      </View>
    </View>
  );
}
