import * as Haptics from "expo-haptics";
import { Typography } from "heroui-native";
import { type ReactNode, useEffect } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/** Width of the trailing action slot the content slides away from. */
const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = ACTION_WIDTH / 2;
const FLING_VELOCITY = 400;
const spring = { damping: 24, stiffness: 260, mass: 0.8 };
const actionLabel = { fontSize: 10, lineHeight: 12 };

function thresholdHaptic() {
  Haptics.selectionAsync();
}

export type SwipeAction = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  /** Tile fill and text classes, for example `bg-accent`. */
  className: string;
  textClassName: string;
};

type SwipeableRowProps = {
  /** Open rows stay open until the list closes them or the user taps. */
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Trailing action revealed by a left swipe. Omit to disable swiping. */
  action?: SwipeAction;
  /** Tap on the content while the row is closed. */
  onPress?: () => void;
  accessibilityHint?: string;
  /** Classes for the clipping container, for example rounded corners. */
  className?: string;
  children: ReactNode;
};

/**
 * Row whose content slides left to reveal one action tile. The slide resists
 * past the open point and snaps open or closed on release; crossing the
 * threshold ticks a haptic. Children must paint their own opaque background
 * so the tile stays hidden while closed.
 */
export function SwipeableRow({
  isOpen,
  onOpenChange,
  action,
  onPress,
  accessibilityHint,
  className,
  children,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const pastThreshold = useSharedValue(false);

  // The list owns which row is open; follow it when another row takes over.
  useEffect(() => {
    translateX.value = withSpring(isOpen ? -ACTION_WIDTH : 0, spring);
  }, [isOpen, translateX]);

  const pan = Gesture.Pan()
    .enabled(action !== undefined)
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      dragStart.value = translateX.value;
      pastThreshold.value = translateX.value <= -OPEN_THRESHOLD;
    })
    .onUpdate((event) => {
      const raw = dragStart.value + event.translationX;
      let next = raw;
      if (raw > 0) {
        next = raw * 0.2;
      } else if (raw < -ACTION_WIDTH) {
        next = -ACTION_WIDTH + (raw + ACTION_WIDTH) * 0.25;
      }
      translateX.value = next;

      const crossed = next <= -OPEN_THRESHOLD;
      if (crossed !== pastThreshold.value) {
        pastThreshold.value = crossed;
        if (crossed) scheduleOnRN(thresholdHaptic);
      }
    })
    .onEnd((event) => {
      const shouldOpen =
        event.velocityX < -FLING_VELOCITY ||
        (event.velocityX < FLING_VELOCITY &&
          translateX.value <= -OPEN_THRESHOLD);
      translateX.value = withSpring(shouldOpen ? -ACTION_WIDTH : 0, spring);
      scheduleOnRN(onOpenChange, shouldOpen);
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = () => {
    if (isOpen) {
      onOpenChange(false);
      return;
    }
    onPress?.();
  };

  return (
    <View className={`overflow-hidden ${className ?? ""}`}>
      {action ? (
        <View
          className="absolute inset-y-0 right-0 items-center justify-center"
          style={{ width: ACTION_WIDTH }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              onOpenChange(false);
              action.onPress();
            }}
            className={`h-[58px] w-[66px] items-center justify-center gap-1 rounded-2xl active:opacity-80 ${action.className}`}
          >
            {action.icon}
            <Typography
              weight="medium"
              className={action.textClassName}
              style={actionLabel}
            >
              {action.label}
            </Typography>
          </Pressable>
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={contentStyle}>
          <Pressable
            accessibilityRole={onPress ? "button" : undefined}
            accessibilityHint={accessibilityHint}
            onPress={onPress || isOpen ? handlePress : undefined}
            className={onPress ? "active:opacity-80" : undefined}
          >
            {children}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
