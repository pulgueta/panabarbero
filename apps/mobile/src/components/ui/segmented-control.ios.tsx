import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";

import type { SegmentedControlProps } from "@/components/ui/segmented-control";

const segmented = [pickerStyle("segmented")];

/**
 * Native SwiftUI segmented picker (Liquid Glass on iOS 26). Every iOS that
 * SDK 58 supports has it, so there is no version gate; Android resolves the
 * sibling `segmented-control.tsx` instead.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <Host matchContents>
      <Picker<T>
        modifiers={segmented}
        selection={value}
        onSelectionChange={(next) => {
          if (next === value) return;
          Haptics.selectionAsync();
          onChange(next);
        }}
      >
        {segments.map((segment) => (
          <Text key={segment.value} modifiers={[tag(segment.value)]}>
            {segment.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
