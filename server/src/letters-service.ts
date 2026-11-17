import type { LetterRow } from './db/schema';
import type { UserCrypto } from './vault';

/** Same shape as the app's `Letter` (src/lib/types.ts). `text` is present only once the letter has unlocked. */
export type Letter = {
  id: string;
  /** The day it was written, YYYY-MM-DD. */
  writtenOn: string;
  unlockOn: string;
  locked: boolean;
  opened: boolean;
  text?: string;
};

const aad = (userId: string, id: string) => `${userId}:letter:${id}`;

export const sealLetter = (userId: string, id: string, text: string, crypto: UserCrypto) =>
  crypto.seal(text, aad(userId, id));

const MS_PER_DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * "Today" for deciding whether a letter has unlocked. The server doesn't know the writer's timezone, so it accepts the
 * day the app says it is, but only within a day of the server's own date. Anything else falls back to the server's.
 */
export function effectiveToday(clientToday: string | undefined, now: Date): string {
  const server = dayKey(now);
  if (!clientToday || !/^\d{4}-\d{2}-\d{2}$/.test(clientToday)) return server;
  const gap = Math.abs(Date.parse(`${clientToday}T00:00:00Z`) - Date.parse(`${server}T00:00:00Z`));
  return gap <= MS_PER_DAY ? clientToday : server;
}

/** The letter as the app sees it. Before its unlock date the text is never opened, let alone sent. */
export function viewLetter(row: LetterRow, today: string, crypto: UserCrypto): Letter {
  const locked = row.unlockOn > today;
  return {
    id: row.id,
    writtenOn: row.writtenOn,
    unlockOn: row.unlockOn,
    locked,
    opened: row.openedAt !== null,
    ...(locked ? {} : { text: crypto.open(row.textEnc, aad(row.userId, row.id)) }),
  };
}
