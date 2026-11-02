import { Typography } from "heroui-native";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, View } from "react-native";

const groupLabel = { fontSize: 11, lineHeight: 14, letterSpacing: 0.6 };
const groupFooter = { fontSize: 12, lineHeight: 16 };
const rowTitle = { fontSize: 14, lineHeight: 18 };
const rowSubtitle = { fontSize: 12, lineHeight: 16 };

type ListGroupProps = {
  label: string;
  /** Muted caption under the card. */
  footer?: string;
  children: ReactNode;
};

/**
 * Settings group: an uppercase label, then one radius-20 card whose children
 * are split by hairlines inset to the text column.
 */
export function ListGroup({ label, footer, children }: ListGroupProps) {
  const items = Children.toArray(children);

  return (
    <View className="gap-2">
      <Typography
        weight="medium"
        color="muted"
        className="px-4 uppercase"
        style={groupLabel}
      >
        {label}
      </Typography>
      <View className="overflow-hidden rounded-[20px] bg-agenda-card">
        {items.map((item, index) => (
          // Children carry no stable ids; order is fixed per group.
          <Fragment key={index}>
            {index > 0 ? <View className="ml-4 h-px bg-separator" /> : null}
            {item}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Typography color="muted" className="px-4" style={groupFooter}>
          {footer}
        </Typography>
      ) : null}
    </View>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned value or control. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Red title for sign out and similar actions. */
  destructive?: boolean;
  /** Dims the title, for example a closed day. */
  muted?: boolean;
};

/** 52 pt row: title, optional subtitle, optional trailing slot. */
export function ListRow({
  title,
  subtitle,
  trailing,
  onPress,
  destructive = false,
  muted = false,
}: ListRowProps) {
  const titleClass = destructive
    ? "text-danger"
    : muted
      ? "text-muted"
      : "text-foreground";

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      className="min-h-[52px] flex-row items-center gap-3 px-4 py-2 active:bg-surface-tertiary"
    >
      <View className="flex-1 gap-0.5">
        <Typography
          weight="medium"
          className={titleClass}
          style={rowTitle}
          numberOfLines={1}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography color="muted" style={rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}
