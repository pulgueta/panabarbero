import * as Haptics from "expo-haptics";
import { Skeleton, Typography } from "heroui-native";
import { Pressable, View } from "react-native";

import { EmptyState } from "@/components/ui/empty-state";

const tabularNums = { fontVariant: ["tabular-nums" as const] };
const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

export type Slot = { time: string; minutes: number };

type SlotGridProps = {
  /** `undefined` while the slots load. */
  slots: Slot[] | undefined;
  /** Minutes since Bogotá midnight of the chosen slot. */
  value?: number;
  onChange: (minutes: number) => void;
};

/** Three-column grid of free time chips for one day. */
export function SlotGrid({ slots, value, onChange }: SlotGridProps) {
  if (slots === undefined) {
    return (
      <View className="flex-row flex-wrap gap-2">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-11 w-[31%] rounded-xl" />
        ))}
      </View>
    );
  }

  if (slots.length === 0) {
    return <EmptyState title="No hay horarios libres este día." />;
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {slots.map((slot) => {
        const isSelected = slot.minutes === value;
        return (
          <Pressable
            key={slot.minutes}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(slot.minutes);
            }}
            className={`h-11 w-[31%] items-center justify-center rounded-xl ${
              isSelected ? "bg-accent" : "bg-agenda-pill"
            }`}
          >
            <Typography
              weight="medium"
              className={isSelected ? "text-accent-foreground" : undefined}
              style={tabularNums}
            >
              {slot.time}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
