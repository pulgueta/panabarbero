import { Typography } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import type { Appointment } from "@/lib/appointments";
import { formatDayTime } from "@/lib/dates";

const tabularNums = { fontVariant: ["tabular-nums" as const] };

/** Above this count the section starts collapsed to one summary row. */
const MAX_VISIBLE = 2;

type RescheduleRequestsProps = {
  /** `undefined` while loading. */
  requests: Appointment[] | undefined;
  onOpen: (appointment: Appointment) => void;
};

/** Customer requests to move an appointment, shown above the day list. */
export function RescheduleRequests({
  requests,
  onOpen,
}: RescheduleRequestsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!requests || requests.length === 0) return null;

  const sorted = [...requests].sort((a, b) => a.date - b.date);
  const isCollapsible = sorted.length > MAX_VISIBLE;

  return (
    <View className="border-border border-b py-2">
      <View className="flex-row items-center justify-between px-5 py-1">
        <Typography.Paragraph type="body-sm" color="muted" weight="medium">
          Solicitudes de reagendamiento
        </Typography.Paragraph>
        {isCollapsible && isExpanded ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsExpanded(false)}
            hitSlop={8}
          >
            <Typography.Paragraph type="body-sm" className="text-link">
              Ocultar
            </Typography.Paragraph>
          </Pressable>
        ) : null}
      </View>

      {isCollapsible && !isExpanded ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsExpanded(true)}
          className="min-h-12 flex-row items-center px-5 py-2 active:bg-surface-secondary"
        >
          <Typography weight="medium" className="flex-1">
            {sorted.length} solicitudes pendientes
          </Typography>
          <Typography className="text-link">Ver</Typography>
        </Pressable>
      ) : (
        sorted.map((request) => (
          <RequestRow
            key={request._id}
            request={request}
            onPress={() => onOpen(request)}
          />
        ))
      )}
    </View>
  );
}

function RequestRow({
  request,
  onPress,
}: {
  request: Appointment;
  onPress: () => void;
}) {
  const proposed =
    request.proposedDate !== undefined
      ? ` → ${formatDayTime(request.proposedDate)}`
      : "";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-12 gap-0.5 px-5 py-2 active:bg-surface-secondary"
    >
      <Typography weight="medium" truncate>
        {request.customerName}
      </Typography>
      <Typography.Paragraph
        type="body-sm"
        color="muted"
        truncate
        style={tabularNums}
      >
        {formatDayTime(request.date)}
        {proposed}
      </Typography.Paragraph>
    </Pressable>
  );
}
