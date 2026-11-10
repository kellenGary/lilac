import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { decrypt, encrypt } from '../src/crypto';
import type { Db } from '../src/db/client';
import * as schema from '../src/db/schema';
import { entries, userKeys } from '../src/db/schema';
import { reencryptLegacy } from '../src/reencrypt';
import { createVault } from '../src/vault';
import { fakeClassify, fakeTag } from './fake-classifier';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-20T12:00:00Z');
const master = randomBytes(32);
const aad = (user: string, date: string) => `${user}:${date}`;

let db: Db;
const deleteAuthUser = vi.fn(async () => {});

beforeAll(async () => {
  const pgDb = drizzle(new PGlite(), { schema });
  await migrate(pgDb, { migrationsFolder: 'drizzle' });
  db = pgDb as unknown as Db;
});

beforeEach(async () => {
  await db.delete(entries);
  await db.delete(userKeys);
  deleteAuthUser.mockClear();
});

const vault = () => createVault(db, master);

/** An entry as the server wrote it before per-user keys existed: sealed with the master key. */
async function insertLegacy(userId: string, date: string, text: string, withMeta = true) {
  const a = aad(userId, date);
  await db.insert(entries).values({
    userId,
    entryDate: date,
    textEnc: encrypt(text, master, a),
    highlightsEnc: encrypt('[]', master, a),
    metaEnc: withMeta ? encrypt(JSON.stringify({ themes: [], crisis: false, feeling: null }), master, a) : null,
    depression: 20,
    anxiety: 30,
    meaning: 70,
  });
}

describe('per-user keys', () => {
  it('gives each user their own key, stored wrapped and never in the clear', async () => {
    const v = vault();
    const a = await v.forWrite(ALICE);
    const b = await v.forWrite(BOB);
    const sealedA = a.seal('hello', 'x');
    const sealedB = b.seal('hello', 'x');
    expect(sealedA.startsWith('v2.')).toBe(true);

    const rows = await db.select().from(userKeys);
    expect(rows).toHaveLength(2);
    expect(rows[0].wrappedKey).not.toBe(rows[1].wrappedKey);
    // The stored key is a master-key ciphertext, not 32 raw bytes.
    expect(rows[0].wrappedKey.startsWith('v1.')).toBe(true);
    expect(sealedA).not.toBe(sealedB);
  });

  it("one user's key cannot open another user's data, even for the same row address", async () => {
    const v = vault();
    const alice = await v.forWrite(ALICE);
    const bob = await v.forWrite(BOB);
    const sealed = alice.seal('only for alice', aad(ALICE, '2026-10-19'));
    expect(alice.open(sealed, aad(ALICE, '2026-10-19'))).toBe('only for alice');
    expect(() => bob.open(sealed, aad(ALICE, '2026-10-19'))).toThrow();
  });

  it('the master key alone cannot open v2 data', async () => {
    const alice = await vault().forWrite(ALICE);
    const sealed = alice.seal('secret', 'x');
    expect(() => decrypt(sealed, master, 'x')).toThrow();
  });

  it('a wrapped key moved onto another user does not unwrap', async () => {
    await vault().forWrite(ALICE);
    const [row] = await db.select().from(userKeys).where(eq(userKeys.userId, ALICE));
    await db.insert(userKeys).values({ userId: BOB, wrappedKey: row.wrappedKey });
    await expect(vault().forRead(BOB)).rejects.toThrow();
  });

  it('concurrent first writes end up with a single key that every request agrees on', async () => {
    const v = vault();
    const handles = await Promise.all(Array.from({ length: 8 }, () => v.forWrite(ALICE)));
    expect(await db.select().from(userKeys)).toHaveLength(1);
    const sealed = handles[0].seal('same key', 'x');
    for (const h of handles) expect(h.open(sealed, 'x')).toBe('same key');
    // Even a different server instance (empty cache) agrees.
    expect((await vault().forRead(ALICE)).open(sealed, 'x')).toBe('same key');
  });

  it('forget erases the key for good: the data is unreadable even with the master key and a restored copy', async () => {
    const v = vault();
    const alice = await v.forWrite(ALICE);
    const sealed = alice.seal('please forget me', aad(ALICE, '2026-10-19'));

    await v.forget(ALICE);
    expect(await db.select().from(userKeys)).toHaveLength(0);
    // Same process (cache cleared by forget) and a fresh one (nothing cached) both fail.
    await expect((async () => (await v.forRead(ALICE)).open(sealed, aad(ALICE, '2026-10-19')))()).rejects.toThrow();
    await expect((async () => (await vault().forRead(ALICE)).open(sealed, aad(ALICE, '2026-10-19')))()).rejects.toThrow();
    expect(() => decrypt(sealed, master, aad(ALICE, '2026-10-19'))).toThrow();
    // Safe to repeat.
    await expect(v.forget(ALICE)).resolves.toBeUndefined();
  });

  it('forgets a cached key after its time is up, so an erased user stops working on other instances too', async () => {
    let clock = 0;
    const v = createVault(db, master, { ttlMs: 1000, now: () => clock });
    const other = createVault(db, master, { ttlMs: 1000, now: () => clock });
    const sealed = (await v.forWrite(ALICE)).seal('x', 'a');
    expect((await other.forRead(ALICE)).open(sealed, 'a')).toBe('x');
    await v.forget(ALICE);
    expect((await other.forRead(ALICE)).open(sealed, 'a')).toBe('x'); // still cached on the other instance
    clock = 1500;
    await expect((async () => (await other.forRead(ALICE)).open(sealed, 'a'))()).rejects.toThrow();
  });

  it('reading never creates a key, and old (v1) entries still open without one', async () => {
    await insertLegacy(ALICE, '2026-10-19', 'written long ago');
    const [row] = await db.select().from(entries);
    const read = await vault().forRead(ALICE);
    expect(read.open(row.textEnc, aad(ALICE, '2026-10-19'))).toBe('written long ago');
    expect(await db.select().from(userKeys)).toHaveLength(0);
    expect(() => read.seal('x', 'y')).toThrow();
  });
});

describe('through the API', () => {
  const app = () =>
    createApp({
      db,
      vault: vault(),
      verifyToken: async (t: string) => ({ userId: t.slice(5) }),
      deleteAuthUser,
      classify: fakeClassify,
      tag: fakeTag,
      corsOrigins: [],
      now: () => NOW,
    });
  const call = (path: string, init: RequestInit & { as: string }) =>
    app().request(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer user:${init.as}` } });
  const put = (date: string, text: string, as = ALICE) => call(`/v1/entries/${date}`, { method: 'PUT', body: JSON.stringify({ text }), as });

  it('reads old entries as before, and re-seals an edited one with the user key', async () => {
    await insertLegacy(ALICE, '2026-10-18', 'old entry');
    const before = await (await call('/v1/entries/2026-10-18', { as: ALICE })).json();
    expect(before.text).toBe('old entry');
    expect(await db.select().from(userKeys)).toHaveLength(0);

    await put('2026-10-18', 'edited entry');
    const [row] = await db.select().from(entries);
    expect(row.textEnc.startsWith('v2.')).toBe(true);
    expect(row.metaEnc?.startsWith('v2.')).toBe(true);
    expect((await (await call('/v1/entries/2026-10-18', { as: ALICE })).json()).text).toBe('edited entry');
  });

  it('writes and reads mixed old and new entries in one list and in the export', async () => {
    await insertLegacy(ALICE, '2026-10-17', 'old');
    await put('2026-10-19', 'new');
    const list = await (await call('/v1/entries', { as: ALICE })).json();
    expect(list.entries.map((e: { text: string }) => e.text)).toEqual(['old', 'new']);
    const exported = await (await call('/v1/export', { as: ALICE })).json();
    expect(exported.entries).toHaveLength(2);
  });

  it('deleting the account erases the key, so a restored backup of the rows is unreadable', async () => {
    await put('2026-10-19', 'a private thought');
    const [backup] = await db.select().from(entries); // what a database backup would hold
    expect((await call('/v1/me', { method: 'DELETE', as: ALICE })).status).toBe(204);
    expect(await db.select().from(userKeys)).toHaveLength(0);

    await db.insert(entries).values(backup); // restore from backup
    expect((await call('/v1/entries/2026-10-19', { as: ALICE })).status).toBe(500);
    expect(() => decrypt(backup.textEnc, master, aad(ALICE, '2026-10-19'))).toThrow();
  });

  it("a second user's data is untouched by the first user's deletion", async () => {
    await put('2026-10-19', 'alice', ALICE);
    await put('2026-10-19', 'bob', BOB);
    await call('/v1/me', { method: 'DELETE', as: ALICE });
    expect((await (await call('/v1/entries/2026-10-19', { as: BOB })).json()).text).toBe('bob');
  });
});

describe('re-encrypting old entries', () => {
  it('moves every v1 field to the owner key and leaves the content identical', async () => {
    await insertLegacy(ALICE, '2026-10-16', 'one');
    await insertLegacy(ALICE, '2026-10-17', 'two', false);
    await insertLegacy(BOB, '2026-10-17', 'three');
    const stats = await reencryptLegacy(db, vault(), { batch: 2 });
    expect(stats).toEqual({ scanned: 3, updated: 3, skipped: 0, failed: 0 });

    const rows = await db.select().from(entries);
    for (const r of rows) {
      expect(r.textEnc.startsWith('v2.')).toBe(true);
      expect(r.highlightsEnc.startsWith('v2.')).toBe(true);
      expect(r.metaEnc === null || r.metaEnc.startsWith('v2.')).toBe(true);
    }
    const read = await vault().forRead(ALICE);
    const one = rows.find((r) => r.userId === ALICE && r.entryDate === '2026-10-16')!;
    expect(read.open(one.textEnc, aad(ALICE, '2026-10-16'))).toBe('one');
    expect(rows.find((r) => r.entryDate === '2026-10-17' && r.userId === ALICE)!.metaEnc).toBeNull();
  });

  it('can be run twice, and a second run finds nothing to do', async () => {
    await insertLegacy(ALICE, '2026-10-16', 'one');
    await reencryptLegacy(db, vault());
    expect(await reencryptLegacy(db, vault())).toEqual({ scanned: 0, updated: 0, skipped: 0, failed: 0 });
  });

  it('a dry run reads everything and writes nothing, not even a key', async () => {
    await insertLegacy(ALICE, '2026-10-16', 'one');
    const before = await db.select().from(entries);
    const stats = await reencryptLegacy(db, vault(), { dryRun: true });
    expect(stats).toEqual({ scanned: 1, updated: 1, skipped: 0, failed: 0 });
    expect(await db.select().from(entries)).toEqual(before);
    expect(await db.select().from(userKeys)).toHaveLength(0);
  });

  it('leaves unreadable entries alone, counts them, and keeps going', async () => {
    await insertLegacy(ALICE, '2026-10-16', 'good');
    await db.insert(entries).values({
      userId: BOB,
      entryDate: '2026-10-16',
      textEnc: encrypt('sealed with some other key', randomBytes(32), aad(BOB, '2026-10-16')),
      highlightsEnc: encrypt('[]', master, aad(BOB, '2026-10-16')),
      metaEnc: null,
      depression: 1,
      anxiety: 1,
      meaning: 1,
    });
    const stats = await reencryptLegacy(db, vault());
    expect(stats).toMatchObject({ scanned: 2, updated: 1, failed: 1 });
    const bob = (await db.select().from(entries).where(eq(entries.userId, BOB)))[0];
    expect(bob.highlightsEnc.startsWith('v1.')).toBe(true); // untouched
  });
});
