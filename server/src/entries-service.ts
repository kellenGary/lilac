import type { EntryRow } from './db/schema';
import type { Entry, Feeling, Highlight, Meta, Tags } from './types';
import type { UserCrypto } from './vault';

const aad = (userId: string, date: string) => `${userId}:${date}`;

export function sealMeta(userId: string, date: string, meta: Meta, crypto: UserCrypto): string {
  return crypto.seal(JSON.stringify(meta), aad(userId, date));
}

export function openMeta(row: EntryRow, crypto: UserCrypto): Meta {
  if (!row.metaEnc) return { themes: [], crisis: false, feeling: null };
  const meta = JSON.parse(crypto.open(row.metaEnc, aad(row.userId, row.entryDate))) as Partial<Meta>;
  return { themes: meta.themes ?? [], crisis: meta.crisis ?? false, feeling: meta.feeling ?? null };
}

export function sealEntry(
  userId: string,
  date: string,
  text: string,
  highlights: Highlight[],
  tags: Tags,
  feeling: Feeling,
  crypto: UserCrypto,
) {
  return {
    textEnc: crypto.seal(text, aad(userId, date)),
    highlightsEnc: crypto.seal(JSON.stringify(highlights), aad(userId, date)),
    metaEnc: sealMeta(userId, date, { ...tags, feeling }, crypto),
  };
}

export function openEntry(row: EntryRow, crypto: UserCrypto): Entry {
  const a = aad(row.userId, row.entryDate);
  const meta = openMeta(row, crypto);
  return {
    date: row.entryDate,
    text: crypto.open(row.textEnc, a),
    highlights: JSON.parse(crypto.open(row.highlightsEnc, a)) as Highlight[],
    scores: { depression: row.depression, anxiety: row.anxiety, meaning: row.meaning },
    themes: meta.themes,
    crisis: meta.crisis,
    feeling: meta.feeling,
  };
}
