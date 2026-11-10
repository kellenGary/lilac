import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import type { Db } from '../src/db/client';
import { entries, userKeys } from '../src/db/schema';
import * as schema from '../src/db/schema';
import { createVault } from '../src/vault';
import { fakeClassify, fakeTag } from './fake-classifier';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-20T12:00:00Z');

let db: Db;
const deleteAuthUser = vi.fn(async () => {});
let classify = fakeClassify;

const depsFor = () => ({
  db,
  vault: createVault(db, randomBytesKey),
  // Tokens are just "user:<id>" in tests.
  verifyToken: async (token: string) => {
    if (!token.startsWith('user:')) throw new Error('bad token');
    return { userId: token.slice(5) };
  },
  deleteAuthUser,
  classify,
  tag: fakeTag,
  corsOrigins: ['http://localhost:8081'],
  now: () => NOW,
});

const app = () => createApp(depsFor());

const randomBytesKey = randomBytes(32);

const call = (path: string, init: RequestInit & { as?: string } = {}) => {
  const { as, ...rest } = init;
  return app().request(path, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer user:${as}` } : {}) },
  });
};
const put = (date: string, text: string, as = ALICE) => call(`/v1/entries/${date}`, { method: 'PUT', body: JSON.stringify({ text }), as });

beforeAll(async () => {
  const pg = new PGlite();
  const pgDb = drizzle(pg, { schema });
  await migrate(pgDb, { migrationsFolder: 'drizzle' });
  db = pgDb as unknown as Db;
});

beforeEach(async () => {
  classify = fakeClassify;
  await db.delete(entries);
  await db.delete(userKeys);
  deleteAuthUser.mockClear();
});

describe('auth', () => {
  it('rejects missing and invalid tokens', async () => {
    expect((await call('/v1/entries')).status).toBe(401);
    expect((await app().request('/v1/entries', { headers: { Authorization: 'Bearer nope' } })).status).toBe(401);
  });
  it('health is public', async () => {
    expect((await call('/health')).status).toBe(200);
  });
});

describe('entries', () => {
  it('creates, reads and lists an entry with scores', async () => {
    const res = await put('2026-10-19', 'Slow morning. I cleared the desk and went for a hike with a friend.');
    expect(res.status).toBe(200);
    const created = await res.json();
    expect(created.date).toBe('2026-10-19');
    expect(created.scores.meaning).toBeGreaterThan(50);
    expect(created.highlights.some((h: { signal: string }) => h.signal === 'meaning')).toBe(true);

    const got = await (await call('/v1/entries/2026-10-19', { as: ALICE })).json();
    expect(got.text).toContain('cleared the desk');

    const list = await (await call('/v1/entries', { as: ALICE })).json();
    expect(list.entries).toHaveLength(1);
  });

  it('stores text encrypted, not as plaintext', async () => {
    await put('2026-10-19', 'a very private thought');
    const [row] = await db.select().from(entries);
    expect(row.textEnc).not.toContain('private');
    // New entries are sealed with the user's own key (v2), not the master key.
    expect(row.textEnc.startsWith('v2.')).toBe(true);
    expect(row.highlightsEnc.startsWith('v2.')).toBe(true);
  });

  it('editing re-scores and keeps one row per day', async () => {
    const first = await (await put('2026-10-19', 'Calm day.')).json();
    const second = await (await put('2026-10-19', 'Deadline stress, I felt anxious and worried and tense.')).json();
    expect(second.scores.anxiety).toBeGreaterThan(first.scores.anxiety);
    expect(await db.select().from(entries)).toHaveLength(1);
  });

  it('filters by date range, oldest first', async () => {
    await put('2026-10-17', 'one');
    await put('2026-10-19', 'two');
    await put('2026-10-18', 'three');
    const all = (await (await call('/v1/entries', { as: ALICE })).json()).entries.map((e: { date: string }) => e.date);
    expect(all).toEqual(['2026-10-17', '2026-10-18', '2026-10-19']);
    const ranged = (await (await call('/v1/entries?from=2026-10-18&to=2026-10-18', { as: ALICE })).json()).entries;
    expect(ranged).toHaveLength(1);
  });

  it("never shows one user another user's entries", async () => {
    await put('2026-10-19', 'alice only');
    expect((await (await call('/v1/entries', { as: BOB })).json()).entries).toHaveLength(0);
    expect((await call('/v1/entries/2026-10-19', { as: BOB })).status).toBe(404);
    expect((await call('/v1/entries/2026-10-19', { method: 'DELETE', as: BOB })).status).toBe(404);
    expect(await db.select().from(entries).where(eq(entries.userId, ALICE))).toHaveLength(1);
  });

  it('validates input', async () => {
    expect((await put('not-a-date', 'x')).status).toBe(400);
    expect((await put('2026-02-30', 'x')).status).toBe(400);
    expect((await put('2026-10-19', '   ')).status).toBe(400);
    expect((await put('2026-10-19', 'x'.repeat(20_001))).status).toBe(400);
    expect((await put('2026-10-25', 'future')).status).toBe(400);
    expect((await put('2026-10-21', 'tomorrow in another timezone')).status).toBe(200);
  });

  it('returns 502 and saves nothing when scoring fails', async () => {
    classify = async () => {
      throw new Error('jev down');
    };
    expect((await put('2026-10-19', 'will not be saved')).status).toBe(502);
    expect(await db.select().from(entries)).toHaveLength(0);
  });

  it('deletes an entry', async () => {
    await put('2026-10-19', 'bye');
    expect((await call('/v1/entries/2026-10-19', { method: 'DELETE', as: ALICE })).status).toBe(204);
    expect((await call('/v1/entries/2026-10-19', { as: ALICE })).status).toBe(404);
  });
});

describe('themes and the crisis check', () => {
  it('returns themes and a crisis flag with each entry, stored encrypted', async () => {
    const calm = await (await put('2026-10-18', 'Went for a hike with a friend, then work stuff.')).json();
    expect(calm.themes).toEqual(expect.arrayContaining(['work', 'friends', 'outdoors']));
    expect(calm.crisis).toBe(false);

    const flagged = await (await put('2026-10-19', 'I do not know how to go on. Some days I want to die.')).json();
    expect(flagged.crisis).toBe(true);
    expect((await (await call('/v1/entries/2026-10-19', { as: ALICE })).json()).crisis).toBe(true);

    const [row] = await db.select().from(entries).where(eq(entries.entryDate, '2026-10-19'));
    expect(row.metaEnc).not.toContain('crisis');
    expect(row.metaEnc?.startsWith('v2.')).toBe(true);
  });

  it('refresh-insights tags older entries without changing their scores', async () => {
    await put('2026-10-18', 'Deadline at work and no sleep, a friend called.');
    const before = await (await call('/v1/entries/2026-10-18', { as: ALICE })).json();
    await db.update(entries).set({ metaEnc: null }); // simulate an entry from before themes existed
    const untagged = await (await call('/v1/entries/2026-10-18', { as: ALICE })).json();
    expect(untagged.themes).toEqual([]);

    const res = await (await call('/v1/refresh-insights', { method: 'POST', as: ALICE })).json();
    expect(res).toEqual({ updated: 1, failed: 0, more: false });
    const after = await (await call('/v1/entries/2026-10-18', { as: ALICE })).json();
    expect(after.themes).toEqual(expect.arrayContaining(['work', 'sleep', 'friends']));
    expect(after.scores).toEqual(before.scores);
  });

  it('refresh-insights keeps what it could tag when some entries fail, and fails only if nothing works', async () => {
    await put('2026-10-17', 'work friend');
    await put('2026-10-18', 'boom this one fails');
    await db.update(entries).set({ metaEnc: null });

    const flaky = createApp({ ...depsFor(), tag: async (t) => (t.includes('boom') ? Promise.reject(new Error('net down')) : fakeTag(t)) });
    const headers = { Authorization: `Bearer user:${ALICE}` };
    const partial = await (await flaky.request('/v1/refresh-insights', { method: 'POST', headers })).json();
    expect(partial).toEqual({ updated: 1, failed: 1, more: true });
    const tagged = await db.select().from(entries).where(eq(entries.entryDate, '2026-10-17'));
    expect(tagged[0].metaEnc).not.toBeNull();

    // Only the failing entry is left, and now everything fails: that surfaces as an error.
    const dead = createApp({ ...depsFor(), tag: async () => Promise.reject(new Error('net down')) });
    expect((await dead.request('/v1/refresh-insights', { method: 'POST', headers })).status).toBe(502);
  });

  it('refresh-insights only touches the signed-in user', async () => {
    await put('2026-10-18', 'work', BOB);
    await db.update(entries).set({ metaEnc: null });
    await call('/v1/refresh-insights', { method: 'POST', as: ALICE });
    const bobs = await db.select().from(entries).where(eq(entries.userId, BOB));
    expect(bobs[0].metaEnc).toBeNull();
  });
});

describe('check-in (feeling)', () => {
  const putWith = (date: string, body: object, as = ALICE) =>
    call(`/v1/entries/${date}`, { method: 'PUT', body: JSON.stringify(body), as });

  it('stores a 1-5 feeling with the entry, encrypted', async () => {
    const saved = await (await putWith('2026-10-19', { text: 'A fine day.', feeling: 4 })).json();
    expect(saved.feeling).toBe(4);
    expect((await (await call('/v1/entries/2026-10-19', { as: ALICE })).json()).feeling).toBe(4);
    const [row] = await db.select().from(entries);
    expect(row.metaEnc).not.toContain('feeling');
  });

  it('is null when skipped, and editing the text keeps the feeling unless told otherwise', async () => {
    expect((await (await putWith('2026-10-18', { text: 'No check-in today.' })).json()).feeling).toBeNull();

    await putWith('2026-10-19', { text: 'First version.', feeling: 2 });
    expect((await (await putWith('2026-10-19', { text: 'Edited version.' })).json()).feeling).toBe(2);
    expect((await (await putWith('2026-10-19', { text: 'Edited again.', feeling: 5 })).json()).feeling).toBe(5);
    expect((await (await putWith('2026-10-19', { text: 'Cleared.', feeling: null })).json()).feeling).toBeNull();
  });

  it('rejects values outside 1-5', async () => {
    expect((await putWith('2026-10-19', { text: 'x', feeling: 0 })).status).toBe(400);
    expect((await putWith('2026-10-19', { text: 'x', feeling: 6 })).status).toBe(400);
    expect((await putWith('2026-10-19', { text: 'x', feeling: 2.5 })).status).toBe(400);
  });

  it('refresh-insights does not invent a feeling', async () => {
    await put('2026-10-18', 'work');
    await db.update(entries).set({ metaEnc: null });
    await call('/v1/refresh-insights', { method: 'POST', as: ALICE });
    expect((await (await call('/v1/entries/2026-10-18', { as: ALICE })).json()).feeling).toBeNull();
  });
});

describe('privacy', () => {
  it('exports decrypted entries', async () => {
    await put('2026-10-19', 'export me');
    const body = await (await call('/v1/export', { as: ALICE })).json();
    expect(body.entries[0].text).toBe('export me');
  });

  it("deleting the account removes the user's entries and login, and no one else's", async () => {
    await put('2026-10-19', 'mine');
    await put('2026-10-19', 'theirs', BOB);
    expect((await call('/v1/me', { method: 'DELETE', as: ALICE })).status).toBe(204);
    expect(deleteAuthUser).toHaveBeenCalledWith(ALICE);
    const left = await db.select().from(entries);
    expect(left.map((r) => r.userId)).toEqual([BOB]);
  });
});
