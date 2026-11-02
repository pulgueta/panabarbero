import { Typography } from "heroui-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import type { Appointment } from "@/lib/appointments";
import { formatDayTime } from "@/lib/dates";

const tabularNums = { fontVariant: ["tabular-nums" as const] };
const rowLabel = { fontSize: 13, lineHeight: 18 };
const rowDetail = { fontSize: 11, lineHeight: 14 };

/** Above this count the card starts as one summary row. */
const MAX_VISIBLE = 2;
/** The expanded list scrolls past this many 44 pt rows, so the calendar keeps its room. */
const MAX_EXPANDED_HEIGHT = 44 * 5;

type RescheduleRequestsProps = {
  /** `undefined` while loading. */
  requests: Appointment[] | undefined;
  onOpen: (appointment: Appointment) => void;
};

/** Customer requests to move an appointment: 44 pt rows in a card above the calendar. */
export function RescheduleRequests({
  requests,
  onOpen,
}: RescheduleRequestsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!requests || requests.length === 0) return null;

  const sorted = [...requests].sort((a, b) => a.date - b.date);
  const isCollapsible = sorted.length > MAX_VISIBLE;

  return (
    <View className="mb-2 overflow-hidden rounded-[20px] bg-agenda-card">
      {isCollapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => setIsExpanded((value) => !value)}
          className="h-11 flex-row items-center justify-between px-4 active:bg-surface-tertiary"
        >
          <Typography weight="medium" style={rowLabel}>
            {sorted.length} solicitudes de reagendamiento
          </Typography>
          <Typography weight="medium" className="text-accent" style={rowLabel}>
            {isExpanded ? "Ocultar" : "Ver"}
          </Typography>
        </Pressable>
      ) : null}
      {!isCollapsible || isExpanded ? (
        <ScrollView style={{ maxHeight: MAX_EXPANDED_HEIGHT }} bounces={false}>
          {sorted.map((request) => (
            <RequestRow
              key={request._id}
              request={request}
              onPress={() => onOpen(request)}
            />
          ))}
        </ScrollView>
      ) : null}
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
      className="h-11 justify-center px-4 active:bg-surface-tertiary"
    >
      <Typography weight="medium" truncate style={rowLabel}>
        {request.customerName}
      </Typography>
      <Typography color="muted" truncate style={[rowDetail, tabularNums]}>
        {formatDayTime(request.date)}
        {proposed}
      </Typography>
    </Pressable>
  );
}
