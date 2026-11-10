import type { Db } from './db/client';
import { listLegacyEntries, replaceSealed } from './db/entries-repo';
import type { Vault } from './vault';

export type ReencryptStats = {
  scanned: number;
  /** Rows re-sealed (or, in a dry run, rows that would be). */
  updated: number;
  /** Rows the user edited while the job ran. Already sealed the new way; nothing to do. */
  skipped: number;
  /** Rows that could not be opened. Left untouched; the job carries on. */
  failed: number;
};

const isLegacy = (payload: string | null) => payload !== null && payload.startsWith('v1.');

/**
 * Moves every entry sealed with the master key (v1) over to its owner's own key (v2). Safe to stop and start again,
 * to run while the app is serving traffic, and to run twice: it only touches rows that still have a v1 field, and it
 * will not overwrite an entry that changed since it was read.
 *
 * A dry run opens every field to prove it can be read, and writes nothing, not even a new key.
 */
export async function reencryptLegacy(
  db: Db,
  vault: Vault,
  options: { batch?: number; dryRun?: boolean; onBatch?: (stats: ReencryptStats) => void } = {},
): Promise<ReencryptStats> {
  const batch = options.batch ?? 200;
  const stats: ReencryptStats = { scanned: 0, updated: 0, skipped: 0, failed: 0 };
  let after: string | undefined;

  for (;;) {
    const rows = await listLegacyEntries(db, after, batch);
    if (rows.length === 0) break;
    after = rows[rows.length - 1].id;

    for (const row of rows) {
      stats.scanned++;
      try {
        const crypto = options.dryRun ? await vault.forRead(row.userId) : await vault.forWrite(row.userId);
        const aad = `${row.userId}:${row.entryDate}`;
        const move = (payload: string) => {
          const plain = crypto.open(payload, aad); // proves the field is readable before anything is replaced
          return isLegacy(payload) && !options.dryRun ? crypto.seal(plain, aad) : payload;
        };
        const next = {
          textEnc: move(row.textEnc),
          highlightsEnc: move(row.highlightsEnc),
          metaEnc: row.metaEnc === null ? null : move(row.metaEnc),
        };
        if (options.dryRun) stats.updated++;
        else if (await replaceSealed(db, row, next)) stats.updated++;
        else stats.skipped++;
      } catch {
        stats.failed++; // never log the cause: it can quote decrypted data
      }
    }
    options.onBatch?.({ ...stats });
  }
  return stats;
}
