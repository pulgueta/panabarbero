import { Typography } from "heroui-native";
import { useEffect, useState } from "react";
import { type LayoutRectangle, Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type AgendaView = "day" | "week" | "month";

const SEGMENTS: { value: AgendaView; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const segmentLabel = { fontSize: 12, lineHeight: 16 };
const slideTiming = { duration: 200, easing: Easing.out(Easing.cubic) };

/** The last chosen view, kept for the session so the tab reopens where it was. */
let sessionView: AgendaView = "day";

export function getSessionView() {
  return sessionView;
}

export function setSessionView(view: AgendaView) {
  sessionView = view;
}

type ViewSwitcherProps = {
  value: AgendaView;
  onChange: (view: AgendaView) => void;
};

/**
 * Floating "Día · Semana · Mes" pill, 12 pt above the bottom of the timeline
 * card. The raised inner pill slides to the selected segment.
 */
export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  const [layouts, setLayouts] = useState<
    Partial<Record<AgendaView, LayoutRectangle>>
  >({});
  const left = useSharedValue(0);
  const width = useSharedValue(0);

  // The first measurement places the pill; later changes slide it.
  useEffect(() => {
    const target = layouts[value];
    if (!target) return;
    if (width.value === 0) {
      left.value = target.x;
      width.value = target.width;
      return;
    }
    left.value = withTiming(target.x, slideTiming);
    width.value = withTiming(target.width, slideTiming);
  }, [layouts, value, left, width]);

  const pillStyle = useAnimatedStyle(() => ({
    left: left.value,
    width: width.value,
    opacity: width.value === 0 ? 0 : 1,
  }));

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-3 items-center"
    >
      <View
        accessibilityRole="tablist"
        className="h-[30px] flex-row rounded-full bg-agenda-pill p-[2px]"
      >
        <Animated.View
          pointerEvents="none"
          className="absolute top-[2px] bottom-[2px] rounded-full bg-agenda-pill-active"
          style={pillStyle}
        />
        {SEGMENTS.map((segment) => {
          const isSelected = segment.value === value;
          return (
            <Pressable
              key={segment.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(segment.value)}
              onLayout={(event) => {
                const layout = event.nativeEvent.layout;
                setLayouts((current) => ({
                  ...current,
                  [segment.value]: layout,
                }));
              }}
              className="justify-center rounded-full px-3"
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
