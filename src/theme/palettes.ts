/*
 * Themed colors. One source of truth: classNames read these through CSS variables (see tailwind.config.js and
 * ThemeProvider), and SVG/JS code reads the same values through useColors().
 * Data colors (depression / anxiety / meaning) and illustration fills stay constant; they read well on both modes.
 */
export type Palette = {
  cream: string; // page background
  surface: string; // raised panels and inputs
  ink: string; // main text, and the strokes of drawings
  purple: string; // secondary text: labels, prompts, counts
  lilac: string; // accent fill, e.g. the chosen mood face
  muted: string;
  body: string;
  line: string; // hairlines
  track: string; // bar tracks, chips
  edge: string; // button outlines, switch off
  hint: string; // placeholder text
  sage: string; // soft green panel
  sageInk: string;
  sun: string; // soft yellow panel
  rose: string; // error panel
  roseInk: string;
  roseLine: string;
  roseSoft: string; // danger card
  shadow: string;
  blobSage: string;
  blobYellow: string;
  blobPeach: string;
};

export type Mode = 'light' | 'dark';
export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

const lightDay: Palette = {
  cream: '#F8F3E6',
  surface: '#FFFCF3',
  ink: '#17161A',
  purple: '#6B54A3',
  lilac: '#B9A3DC',
  muted: '#6B6752',
  body: '#4A4A3E',
  line: '#E3DAC3',
  track: '#E9E1CC',
  edge: '#D9D0B6',
  hint: '#B8B29B',
  sage: '#D1E2B8',
  sageInk: '#30491C',
  sun: '#F3E4A6',
  rose: '#F1CCC0',
  roseInk: '#8A3622',
  roseLine: '#E2B3A4',
  roseSoft: '#F6D9CE',
  shadow: '#17161A',
  blobSage: '#CFDDB8',
  blobYellow: '#F1E1A0',
  blobPeach: '#F2C9A0',
};

const darkDay: Palette = {
  cream: '#1C1B16',
  surface: '#26241D',
  ink: '#F1EBDB',
  purple: '#B9A3DC',
  lilac: '#6B54A3',
  muted: '#A39E88',
  body: '#CFC8B2',
  line: '#3A372C',
  track: '#34312A',
  edge: '#4A4638',
  hint: '#78746A',
  sage: '#2A3322',
  sageInk: '#BED6A0',
  sun: '#3A3520',
  rose: '#42241D',
  roseInk: '#F0A896',
  roseLine: '#60382E',
  roseSoft: '#36201B',
  shadow: '#000000',
  blobSage: '#34402A',
  blobYellow: '#403B22',
  blobPeach: '#432E22',
};

/** How the light of the day tints each mode. `day` is the base palette untouched. */
const TINTS: Record<Mode, Record<Phase, Partial<Palette>>> = {
  light: {
    dawn: { cream: '#F3F2E2', surface: '#FBFBEF', line: '#DDDCC3', track: '#E4E4D0', edge: '#D3D2B8', sage: '#C9DEAE' },
    day: {},
    dusk: {
      cream: '#F8EBDD',
      surface: '#FFF6EC',
      line: '#E8D3BD',
      track: '#EEDCCB',
      edge: '#E0C8AF',
      muted: '#6E5E50',
      body: '#50443A',
      sun: '#F5DDA8',
      roseSoft: '#F2D0BF',
    },
    night: {
      cream: '#EDE3E2',
      surface: '#F8F0EE',
      ink: '#17161A',
      line: '#DACBC8',
      track: '#E3D6D3',
      edge: '#CEBEBB',
      muted: '#675C61',
      body: '#463E43',
      sage: '#C5D9AE',
      roseSoft: '#EDCFC4',
    },
  },
  dark: {
    dawn: { cream: '#1B1D17', surface: '#252820', line: '#373B2F', track: '#32362B', edge: '#464B3B' },
    day: {},
    dusk: { cream: '#211A16', surface: '#2B221C', line: '#40342B', track: '#3A2F27', edge: '#4F4136', muted: '#AA9E8C' },
    night: {
      cream: '#14171A',
      surface: '#1C2024',
      ink: '#E8E6DA',
      line: '#2C3338',
      track: '#282F34',
      edge: '#3A434A',
      muted: '#969C96',
      body: '#C4C6BC',
    },
  },
};

export function resolvePalette(mode: Mode, phase: Phase): Palette {
  return { ...(mode === 'dark' ? darkDay : lightDay), ...TINTS[mode][phase] };
}

/** Morning 5-10, day 10-16, golden hour 16-20, evening/night 20-5 (local time). */
export function phaseAt(date: Date): Phase {
  const h = date.getHours();
  if (h >= 5 && h < 10) return 'dawn';
  if (h >= 10 && h < 16) return 'day';
  if (h >= 16 && h < 20) return 'dusk';
  return 'night';
}

export const PHASE_LABEL: Record<Phase, string> = {
  dawn: 'Morning colors',
  day: 'Daytime colors',
  dusk: 'Golden hour colors',
  night: 'Evening colors',
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

/** CSS variables in "r g b" form, which Tailwind turns into colors (so opacity modifiers still work). */
export function cssVars(p: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (k === 'shadow' || k.startsWith('blob')) continue;
    out[`--color-${k}`] = rgb(v);
  }
  return out;
}
