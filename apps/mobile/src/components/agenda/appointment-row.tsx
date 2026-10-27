import { Chip, Skeleton, Typography } from "heroui-native";
import { Pressable, View } from "react-native";

import {
  type Appointment,
  appointmentStatus,
  priceLabel,
  servicesLabel,
} from "@/lib/appointments";
import { formatTime } from "@/lib/dates";

const tabularNums = { fontVariant: ["tabular-nums" as const] };

type AppointmentRowProps = {
  appointment: Appointment;
  /** Omitted for barbers, who only see their own appointments. */
  barberName?: string;
  onPress: () => void;
};

export function AppointmentRow({
  appointment,
  barberName,
  onPress,
}: AppointmentRowProps) {
  const status = appointmentStatus(appointment.status);
  const price = priceLabel(appointment);
  const subtitle = barberName
    ? `${servicesLabel(appointment)} · ${barberName}`
    : servicesLabel(appointment);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-16 flex-row items-center gap-3 px-5 py-3 active:bg-surface-secondary"
    >
      <Typography weight="medium" className="w-12" style={tabularNums}>
        {formatTime(appointment.date)}
      </Typography>
      <View className="flex-1 gap-0.5">
        <Typography weight="medium" truncate>
          {appointment.customerName}
        </Typography>
        <Typography.Paragraph type="body-sm" color="muted" truncate>
          {subtitle}
        </Typography.Paragraph>
      </View>
      <View className="items-end gap-1">
        <Chip size="sm" variant="soft" color={status.color}>
          {status.label}
        </Chip>
        {price ? (
          <Typography.Paragraph type="body-sm" style={tabularNums}>
            {price}
          </Typography.Paragraph>
        ) : null}
      </View>
    </Pressable>
  );
}

export function AppointmentRowSkeleton() {
  return (
    <View className="min-h-16 flex-row items-center gap-3 px-5 py-3">
      <Skeleton className="h-4 w-12 rounded-md" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="h-3 w-24 rounded-md" />
      </View>
      <Skeleton className="h-6 w-20 rounded-full" />
    </View>
  );
}
