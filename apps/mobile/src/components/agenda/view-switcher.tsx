import { Typography } from "heroui-native";
import { Pressable, View } from "react-native";

export type AgendaView = "day" | "week" | "month";

const SEGMENTS: { value: AgendaView; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const segmentLabel = { fontSize: 12, lineHeight: 16 };

type ViewSwitcherProps = {
  value: AgendaView;
  onChange: (view: AgendaView) => void;
};

/** Floating "Día · Semana · Mes" pill, 12 pt above the bottom of the timeline card. */
export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-3 items-center"
    >
      <View
        accessibilityRole="tablist"
        className="h-[30px] flex-row rounded-full bg-agenda-pill p-[2px]"
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
    </View>
  );
}
