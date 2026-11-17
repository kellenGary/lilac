import { useId, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Ellipse, G, Line, Path, Pattern } from 'react-native-svg';

import { useColors } from '@/state/theme';
import type { Drawing } from './drawings';
import { CREAM, INK, isColored, sketchy } from './sketch';

/** A pencil-sketch look: a wobbly line, a thinner second pass, a fill nudged off the line, and light hatching. */
export function SketchArt({ drawing, maxWidth = 320 }: { drawing: Drawing; maxWidth?: number }) {
  const { ink } = useColors();
  const id = `hatch-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Wobble the shapes once per drawing, not on every render.
  const drawn = useMemo(
    () =>
      drawing.shapes.map((s) => ({
        ...s,
        line: sketchy(s, 1),
        thin: sketchy(s, 4),
      })),
    [drawing],
  );
  // Lines over a light surface stay dark whatever the page is.
  const strokeOf = (s: { fill: string; fixedInk?: boolean }) => (s.fixedInk || s.fill === CREAM || s.fill === INK ? INK : ink);
  const body = drawn.filter((s) => !s.top);
  const top = drawn.filter((s) => s.top);
  const { shadow, width, height } = drawing;

  return (
    <View style={{ width: '100%', maxWidth, aspectRatio: width / height, alignSelf: 'center' }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        accessibilityLabel={drawing.accessibilityLabel}
      >
        <Defs>
          <Pattern id={id} width={5} height={5} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={5} x2={5} y2={0} stroke={INK} strokeOpacity={0.28} strokeWidth={1.1} />
            <Line x1={-2.5} y1={2.5} x2={2.5} y2={-2.5} stroke={INK} strokeOpacity={0.28} strokeWidth={1.1} />
            <Line x1={2.5} y1={7.5} x2={7.5} y2={2.5} stroke={INK} strokeOpacity={0.28} strokeWidth={1.1} />
          </Pattern>
        </Defs>
        <Ellipse cx={shadow.cx} cy={shadow.cy} rx={shadow.rx} ry={shadow.ry} fill={ink} fillOpacity={0.1} />

        {/* Color, nudged a little off the line, then hatched. Each shape is painted in turn, so what sits on top
            of the body (an eye, the paper) is not hatched along with it. */}
        {body.map((s, i) =>
          s.fill === 'none' ? null : (
            <G key={`f${i}`} transform={isColored(s.fill) ? 'translate(3 2.5)' : undefined}>
              <Path d={s.thin} fill={s.fill} />
              {isColored(s.fill) && <Path d={s.thin} fill={`url(#${id})`} />}
            </G>
          ),
        )}

        {/* The line: one firm pass and one thinner pass beside it. */}
        <G fill="none" strokeLinecap="round" strokeLinejoin="round">
          {body.map((s, i) => (
            <Path key={`l${i}`} d={s.line} stroke={strokeOf(s)} strokeWidth={2.6} fill={s.fill === INK ? INK : 'none'} />
          ))}
          {body.map((s, i) => (
            <Path
              key={`t${i}`}
              d={s.thin}
              stroke={strokeOf(s)}
              strokeWidth={1.3}
              strokeOpacity={0.55}
              transform="translate(1.2 -1)"
            />
          ))}
        </G>

        {/* Things held in front of the body: they cover the line behind them. */}
        <G strokeLinecap="round" strokeLinejoin="round">
          {top.map((s, i) => (
            <Path key={`p${i}`} d={s.line} stroke={strokeOf(s)} strokeWidth={2.6} fill={s.fill} />
          ))}
          {top.map((s, i) => (
            <Path
              key={`q${i}`}
              d={s.thin}
              stroke={strokeOf(s)}
              strokeWidth={1.3}
              strokeOpacity={0.55}
              fill="none"
              transform="translate(1.2 -1)"
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}
