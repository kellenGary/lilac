import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/state/theme';
import { Icon, type IconName } from './icons';

/** A soft grouped panel with a small heading. Rows inside are separated by hairlines. */
export function Card({
  title,
  tone = 'default',
  children,
}: {
  title: string;
  tone?: 'default' | 'danger';
  children: ReactNode;
}) {
  const { shadow } = useColors();
  return (
    <View>
      <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-muted">{title}</Text>
      <View
        className={`overflow-hidden rounded-3xl border ${tone === 'danger' ? 'border-roseLine bg-roseSoft' : 'border-line bg-surface'}`}
        style={{ shadowColor: shadow, shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } }}
      >
        {children}
      </View>
    </View>
  );
}

type Tint = 'sage' | 'sun' | 'rose' | 'track';

/** A rounded square holding a line icon, tinted to hint at what the row does. */
function IconTile({ icon, tint }: { icon: IconName; tint: Tint }) {
  const c = useColors();
  const bg = { sage: c.sage, sun: c.sun, rose: c.rose, track: c.track }[tint];
  const fg = { sage: c.sageInk, sun: c.ink, rose: c.roseInk, track: c.ink }[tint];
  return (
    <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
      <Icon name={icon} color={fg} size={19} />
    </View>
  );
}

/**
 * One setting: an icon tile, a title with a short line under it, and what you do on the right. Pass `onPress` to make
 * the whole row a tappable action (with a chevron); pass `action` for a control such as a switch; pass `below` for a
 * control that needs the full width (such as the theme picker).
 */
export function Row({
  title,
  description,
  icon,
  tint = 'sage',
  action,
  value,
  below,
  onPress,
  disabled,
  danger,
  first,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  tint?: Tint;
  action?: ReactNode;
  /** Quiet text on the right, e.g. a busy state. */
  value?: string;
  below?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
  first?: boolean;
}) {
  const { muted, roseInk } = useColors();
  const content = (
    <>
      <View className="flex-row items-center gap-3.5">
        {icon && <IconTile icon={icon} tint={tint} />}
        <View className="flex-1 gap-0.5">
          <Text className={`text-base font-semibold ${danger ? 'text-roseInk' : 'text-ink'}`}>{title}</Text>
          {description && <Text className="text-[13px] leading-[18px] text-muted">{description}</Text>}
        </View>
        {value && <Text className="text-[13px] text-muted">{value}</Text>}
        {action}
        {onPress && !action && !value && <Icon name="chevron" color={danger ? roseInk : muted} size={18} />}
      </View>
      {below && <View className="mt-3.5">{below}</View>}
    </>
  );
  const border = `px-4 py-3.5 ${first ? '' : 'border-t border-line'}`;
  if (!onPress) return <View className={border}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      className={`${border} active:opacity-60 ${disabled ? 'opacity-50' : ''}`}
    >
      {content}
    </Pressable>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-cream px-2 py-3">
      <Text className="text-2xl font-bold tracking-tight text-ink">{value}</Text>
      <Text className="mt-0.5 text-xs text-muted">{label}</Text>
    </View>
  );
}
