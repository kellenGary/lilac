import { CREAM, INK, circle, onLight, path, rect, type Shape } from './sketch';

const BUTTER = '#F2D87C';
const LILAC = '#C9B6E8';
const SAGE = '#A9C29B';

export type Drawing = {
  /** The page-sized box the drawing is laid out in. */
  width: number;
  height: number;
  /** The soft shadow on the ground. */
  shadow: { cx: number; cy: number; rx: number; ry: number };
  shapes: Shape[];
  accessibilityLabel: string;
};

const down = { dy: 10 };

/** Look back: a round yellow fellow holding a magnifying glass up to his eye. */
export const LOOK_BACK: Drawing = {
  width: 320,
  height: 190,
  shadow: { cx: 160, cy: 180, rx: 78, ry: 6 },
  accessibilityLabel: 'A friendly character looking through a magnifying glass',
  shapes: [
    path('M138 128 v38 M182 128 v38 M128 168 h20 M172 168 h20', 'none', down),
    path('M105 70 Q100 20 160 22 Q222 24 218 72 Q216 128 160 128 Q108 128 105 70Z', BUTTER, down),
    circle(184, 62, 9, CREAM, down),
    circle(186, 64, 3.4, INK, down),
    path('M146 100 q18 12 40 0', 'none', down),
    path('M218 86 Q236 102 222 120', 'none', down),
    circle(138, 66, 15, CREAM, down),
    circle(142, 69, 6.5, INK, down),
    circle(138, 66, 31, 'none', down),
    path('M114 48 q6 -9 18 -11', 'none', down),
    // The handle and the hand around it sit over the edge of the body.
    path('M122 92 L96 120 L88 112 L114 85 Z', LILAC, down, true),
    path('M109 87 C100 87 93 92 93.5 99 Q93.5 103 94 106', 'none', down, true),
  ],
};

const paper = { rot: [7, 266, 140] as [number, number, number] };

/** To do: a green cloud ticking off a checklist, with a mug nearby. */
export const TODO: Drawing = {
  width: 320,
  height: 190,
  shadow: { cx: 146, cy: 178, rx: 58, ry: 5 },
  accessibilityLabel: 'A friendly cloud character ticking items off a checklist',
  shapes: [
    path('M130 150 v22 M156 152 v20 M122 174 h16 M148 174 h16'),
    path(
      'M96 104 A30 30 0 0 1 108 56 A34 34 0 0 1 168 48 A34 34 0 0 1 218 88 A32 32 0 0 1 196 140 A32 32 0 0 1 140 152 A32 32 0 0 1 96 104Z',
      SAGE,
    ),
    circle(172, 84, 12, CREAM),
    circle(175, 86, 4.8, INK),
    path('M136 114 q14 10 28 0'),
    path('M216 108 Q234 122 244 99'),
    path('M234 89.2 L241.6 84.4 L254.7 105.2 L247.1 110 Z', BUTTER),
    path('M247.1 110 L254.7 105.2 L254.1 112.7 Z', CREAM),
    rect(238, 112, 64, 60, 3, CREAM, paper),
    onLight(path('M246 128 l4 4 l8 -9 M266 128 h28 M246 144 l4 4 l8 -9 M266 144 h24', 'none', paper)),
    onLight(rect(246, 156, 10, 9, 2, 'none', paper)),
    onLight(path('M266 160 h18', 'none', paper)),
    path('M44 148 h30 v18 a8 8 0 0 1 -8 8 h-14 a8 8 0 0 1 -8 -8 z', LILAC),
    path('M74 152 q13 0 11 11 q-2 6 -11 4'),
    path('M54 138 q-5 -6 0 -11 M64 138 q-5 -6 0 -11'),
  ],
};
