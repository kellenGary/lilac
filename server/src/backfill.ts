import type { Db } from './db/client';
import { listEntriesMissingMeta, setMeta } from './db/entries-repo';
import { sealMeta } from './entries-service';
import type { Tag } from './services/jev';
import type { UserCrypto } from './vault';

/**
 * Tags entries that were written before themes and the crisis check existed. Scores are not touched.
 * Works through at most `limit` entries per call. One entry failing does not stop the rest, and whatever succeeded is
 * kept, so calling again continues where it left off. If nothing at all succeeds, the error is thrown.
 */
export async function backfillMeta(db: Db, userId: string, crypto: UserCrypto, tag: Tag, limit = 60) {
  const rows = await listEntriesMissingMeta(db, userId, limit + 1);
  const batch = rows.slice(0, limit);
  const queue = [...batch];
  let updated = 0;
  let failed = 0;
  let lastError: unknown;

  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      try {
        const text = crypto.open(row.textEnc, `${row.userId}:${row.entryDate}`);
        await setMeta(db, userId, row.entryDate, sealMeta(userId, row.entryDate, { ...(await tag(text)), feeling: null }, crypto));
        updated++;
      } catch (err) {
        failed++;
        lastError = err;
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  if (updated === 0 && failed > 0) throw lastError;
  return { updated, failed, more: failed > 0 || rows.length > limit };
}
