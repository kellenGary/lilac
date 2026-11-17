import { Pressable, Text, type GestureResponderEvent } from 'react-native';

type ButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'lg';
  disabled?: boolean;
  className?: string;
};

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled, className = '' }: ButtonProps) {
  const base = size === 'lg' ? 'h-[52px] px-7 rounded-[22px]' : 'h-10 px-[18px] rounded-[10px]';
  const tone = variant === 'primary' ? 'bg-ink' : 'border border-edge';
  const text = variant === 'primary' ? 'text-cream' : 'text-ink';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center hover:opacity-85 active:scale-[0.97] active:opacity-80 ${base} ${tone} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <Text className={`font-semibold ${size === 'lg' ? 'text-base' : 'text-sm'} ${text}`}>{label}</Text>
    </Pressable>
  );
}
