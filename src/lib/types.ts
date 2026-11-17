export type Signal = 'depression' | 'anxiety' | 'meaning';

export type Scores = Record<Signal, number>;

/** A phrase in the entry text that contributed to a signal. */
export type Highlight = { text: string; signal: Signal };

export type Entry = {
  /** Local calendar day, YYYY-MM-DD. One entry per day. */
  date: string;
  text: string;
  scores: Scores;
  highlights: Highlight[];
  /** Theme keys (see lib/themes.ts) the entry is about. Empty for entries not yet tagged. */
  themes: string[];
  /** True if the entry contains crisis language. Drives the support screen, never shown as a label. */
  crisis: boolean;
  /** The check-in before writing: 1 (rough) to 5 (great), or null if skipped. */
  feeling: number | null;
};

export type Classification = Pick<Entry, 'scores' | 'highlights' | 'themes' | 'crisis'>;

/** A letter to your future self. `text` is only present once it has unlocked. */
export type Letter = {
  id: string;
  /** The day it was written, YYYY-MM-DD. */
  writtenOn: string;
  unlockOn: string;
  locked: boolean;
  /** True once the writer has read it after it unlocked. */
  opened: boolean;
  text?: string;
};
