import * as Haptics from "expo-haptics";
import { Typography } from "heroui-native";
import { useEffect, useState } from "react";
import { type LayoutRectangle, Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type Segment<T extends string> = { value: T; label: string };

export type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

const segmentLabel = { fontSize: 12, lineHeight: 16 };
const slideTiming = { duration: 200, easing: Easing.out(Easing.cubic) };

/**
 * Android fallback of the segmented control: a 30 pt pill whose raised inner
 * pill slides to the selected segment. iOS renders the native SwiftUI picker
 * from `segmented-control.ios.tsx`; both tick the selection haptic.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const [layouts, setLayouts] = useState<Partial<Record<T, LayoutRectangle>>>(
    {},
  );
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
      accessibilityRole="tablist"
      className="h-[30px] flex-row rounded-full bg-agenda-pill p-[2px]"
    >
      <Animated.View
        pointerEvents="none"
        className="absolute top-[2px] bottom-[2px] rounded-full bg-agenda-pill-active"
        style={pillStyle}
      />
      {segments.map((segment) => {
        const isSelected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              if (isSelected) return;
              Haptics.selectionAsync();
              onChange(segment.value);
            }}
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
  );
}
