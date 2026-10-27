import { Chip, Separator, Typography } from "heroui-native";
import type { ReactNode } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";

import {
  type Appointment,
  appointmentStatus,
  formatCop,
  isStartingItem,
  priceLabel,
  totalDuration,
} from "@/lib/appointments";
import { formatDayLabel, formatTime } from "@/lib/dates";

const tabularNums = { fontVariant: ["tabular-nums" as const] };

type AppointmentDetailProps = {
  appointment: Appointment;
  /** Omitted for barbers, who only see their own appointments. */
  barberName?: string;
};

export function AppointmentDetail({
  appointment,
  barberName,
}: AppointmentDetailProps) {
  const status = appointmentStatus(appointment.status);
  const total = priceLabel(appointment);
  const duration = totalDuration(appointment);
  const { contactPhone, contactEmail } = appointment;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 px-5 py-6"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="gap-0.5">
          <Typography
            weight="semibold"
            className="text-2xl"
            style={tabularNums}
          >
            {formatTime(appointment.date)}
          </Typography>
          <Typography.Paragraph color="muted">
            {formatDayLabel(appointment.date)}
          </Typography.Paragraph>
        </View>
        <Chip variant="soft" color={status.color}>
          {status.label}
        </Chip>
      </View>

      <Section title="Cliente">
        <Typography weight="medium">{appointment.customerName}</Typography>
        {contactPhone ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(`tel:${contactPhone}`)}
            hitSlop={8}
          >
            <Typography className="text-link underline">
              {contactPhone}
            </Typography>
          </Pressable>
        ) : null}
        {contactEmail ? (
          <Typography.Paragraph color="muted">
            {contactEmail}
          </Typography.Paragraph>
        ) : null}
      </Section>

      {barberName ? (
        <Section title="Barbero">
          <Typography>{barberName}</Typography>
        </Section>
      ) : null}

      <Section title="Servicios">
        {appointment.items && appointment.items.length > 0 ? (
          appointment.items.map((item) => (
            <View
              key={item.serviceId}
              className="flex-row items-baseline justify-between gap-3"
            >
              <Typography className="flex-1">{item.name}</Typography>
              <Typography style={tabularNums}>
                {isStartingItem(item) ? "Desde " : ""}
                {formatCop(item.finalPrice ?? item.price)}
              </Typography>
            </View>
          ))
        ) : (
          <Typography>Servicio</Typography>
        )}
        {total || duration !== null ? <Separator className="my-1" /> : null}
        {total ? <SummaryLine label="Total" value={total} emphasized /> : null}
        {duration !== null ? (
          <SummaryLine label="Duración" value={`${duration} min`} />
        ) : null}
      </Section>

      {appointment.notes ? (
        <Section title="Notas">
          <Typography>{appointment.notes}</Typography>
        </Section>
      ) : null}

      {/* actions arrive in the next layer */}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Typography.Paragraph type="body-sm" color="muted" weight="medium">
        {title}
      </Typography.Paragraph>
      {children}
    </View>
  );
}

function SummaryLine({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  const weight = emphasized ? "semibold" : "normal";

  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Typography weight={weight}>{label}</Typography>
      <Typography weight={weight} style={tabularNums}>
        {value}
      </Typography>
    </View>
  );
}
