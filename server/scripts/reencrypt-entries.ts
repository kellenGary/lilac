/*
 * Moves entries encrypted with the server's master key (v1) over to each user's own key (v2).
 *   npm run db:reencrypt -- --dry-run     read every old entry, change nothing
 *   npm run db:reencrypt                  do it
 *   npm run db:reencrypt -- --batch=500   rows per batch (default 200)
 *
 * Safe to run while the app is live, to stop with Ctrl-C and run again, and to repeat. Apply the migration
 * (npm run db:migrate) first, so the user_keys table exists. Needs DATABASE_URL and ENTRY_ENCRYPTION_KEY only.
 */
import { parseKey } from '../src/crypto';
import { createDb } from '../src/db/client';
import { reencryptLegacy } from '../src/reencrypt';
import { createVault } from '../src/vault';

const url = process.env.DATABASE_URL;
const keyText = process.env.ENTRY_ENCRYPTION_KEY;
if (!url || !keyText) throw new Error('DATABASE_URL and ENTRY_ENCRYPTION_KEY must be set');

const dryRun = process.argv.includes('--dry-run');
const batch = Number(process.argv.find((a) => a.startsWith('--batch='))?.split('=')[1] ?? 200);

const db = createDb(url);
const vault = createVault(db, parseKey(keyText));

console.log(dryRun ? 'Dry run: nothing will be written.' : 'Re-encrypting old entries with per-user keys.');
const stats = await reencryptLegacy(db, vault, {
  batch,
  dryRun,
  onBatch: (s) => console.log(`  scanned ${s.scanned}, ${dryRun ? 'would update' : 'updated'} ${s.updated}, failed ${s.failed}`),
});
console.log(
  `Done. ${stats.scanned} old entries: ${stats.updated} ${dryRun ? 'would be ' : ''}moved, ${stats.skipped} edited meanwhile, ${stats.failed} unreadable.`,
);
if (stats.failed > 0) console.log('Unreadable entries were left as they are. Check that ENTRY_ENCRYPTION_KEY is the key they were written with.');
process.exit(stats.failed > 0 ? 1 : 0);
