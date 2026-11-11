import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTween } from '@/lib/animation';
import { useColors } from '@/state/theme';

const BLOBS = [
  { size: 520, tone: 'blobSage', delay: 0, pos: { left: -120, bottom: -80 } },
  { size: 460, tone: 'blobYellow', delay: 150, pos: { right: -100, top: -140 } },
  { size: 420, tone: 'blobPeach', delay: 300, pos: { right: 160, bottom: -200 } },
] as const;

/**
 * Each blob is a radial gradient: full color at the centre, fading to nothing at the edge, so it reads as a soft light
 * rather than a disc. A gradient (not a CSS blur) so it looks the same on phones and the web.
 */
function Blob({ size, tone, delay, pos }: (typeof BLOBS)[number]) {
  const color = useColors()[tone];
  const t = useTween(2800, delay);
  const id = `glow-${tone}`;
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          opacity: 1 - 0.35 * t,
          transform: [{ scale: 0.1 + 0.9 * t }],
        },
        pos,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={0.85} />
            <Stop offset="0.35" stopColor={color} stopOpacity={0.5} />
            <Stop offset="0.7" stopColor={color} stopOpacity={0.15} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Soft color blobs that bloom outward on open, then settle into soft glowing lights behind the page. */
export function BloomBackground() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }}
    >
      {BLOBS.map((b, i) => (
        <Blob key={i} {...b} />
      ))}
    </View>
  );
}
