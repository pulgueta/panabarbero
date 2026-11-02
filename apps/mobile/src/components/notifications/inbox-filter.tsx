import { Typography } from "heroui-native";
import { Pressable, View } from "react-native";

export type InboxFilter = "all" | "unread";

const SEGMENTS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "No leídas" },
];

const segmentLabel = { fontSize: 12, lineHeight: 16 };

type InboxFilterPillProps = {
  value: InboxFilter;
  onChange: (value: InboxFilter) => void;
};

/** Compact "Todas · No leídas" pill in the agenda view-switcher style. */
export function InboxFilterPill({ value, onChange }: InboxFilterPillProps) {
  return (
    <View
      accessibilityRole="tablist"
      className="h-[30px] flex-row self-center rounded-full bg-agenda-pill p-[2px]"
    >
      {SEGMENTS.map((segment) => {
        const isSelected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(segment.value)}
            className={`justify-center rounded-full px-3 ${
              isSelected ? "bg-agenda-pill-active" : ""
            }`}
          >
            <Typography
              weight="medium"
              className={isSelected ? "text-foreground" : "text-muted"}
              style={segmentLabel}
            >
              {segment.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
