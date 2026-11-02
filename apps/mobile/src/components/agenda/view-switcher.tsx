import { View } from "react-native";

import {
  type Segment,
  SegmentedControl,
} from "@/components/ui/segmented-control";

export type AgendaView = "day" | "week" | "month";

const SEGMENTS: Segment<AgendaView>[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

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

/** Floating "Día · Semana · Mes" control, 12 pt above the bottom of the timeline card. */
export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-3 items-center"
    >
      <SegmentedControl segments={SEGMENTS} value={value} onChange={onChange} />
    </View>
  );
}
