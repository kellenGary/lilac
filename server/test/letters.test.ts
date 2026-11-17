import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import type { Db } from '../src/db/client';
import { letters } from '../src/db/schema';
import * as schema from '../src/db/schema';
import { effectiveToday } from '../src/letters-service';
import { createVault } from '../src/vault';
import { fakeClassify, fakeTag } from './fake-classifier';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const CARA = '33333333-3333-4333-8333-333333333333';
const SECRET = 'Dear me, remember the quiet mornings by the river.';

let db: Db;
const key = randomBytes(32);

beforeAll(async () => {
  const pg = new PGlite();
  const pgDb = drizzle(pg, { schema });
  await migrate(pgDb, { migrationsFolder: 'drizzle' });
  db = pgDb as unknown as Db;
});

/** An app whose clock is `at`, so a letter can be written on one day and read on another. */
const appAt = (at: string) => {
  const app = createApp({
    db,
    vault: createVault(db, key),
    verifyToken: async (tok) => ({ userId: tok.slice(5) }),
    deleteAuthUser: async () => {},
    classify: fakeClassify,
    tag: fakeTag,
    corsOrigins: [],
    now: () => new Date(`${at}T12:00:00Z`),
  });
  return (path: string, as = ALICE, init: RequestInit = {}) =>
    app.request(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer user:${as}` } });
};
const post = (call: ReturnType<typeof appAt>, body: object, as = ALICE) =>
  call('/v1/letters', as, { method: 'POST', body: JSON.stringify(body) });

describe('letters to future self', () => {
  it('writes a letter that stays locked, and never returns its text early', async () => {
    const day1 = appAt('2026-11-01');
    const res = await post(day1, { text: SECRET, unlockOn: '2026-12-01' });
    expect(res.status).toBe(201);
    const made = await res.json();
    expect(made).toMatchObject({ locked: true, unlockOn: '2026-12-01', writtenOn: '2026-11-01', opened: false });
    expect(made.text).toBeUndefined();

    const list = await (await day1('/v1/letters')).json();
    expect(list.letters).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain('quiet mornings');
    const one = await (await day1(`/v1/letters/${made.id}`)).json();
    expect(one.text).toBeUndefined();
  });

  it('stores the text encrypted', async () => {
    const rows = await db.select().from(letters);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.textEnc).not.toContain('quiet mornings');
  });

  it('opens on the unlock date, and records that it was read', async () => {
    const before = appAt('2026-11-30');
    const [{ id }] = (await (await before('/v1/letters')).json()).letters;
    expect((await (await before(`/v1/letters/${id}`)).json()).text).toBeUndefined();
    expect((await before(`/v1/letters/${id}/open`, ALICE, { method: 'PUT' })).status).toBe(403);

    const onTheDay = appAt('2026-12-01');
    const letter = await (await onTheDay(`/v1/letters/${id}`)).json();
    expect(letter).toMatchObject({ locked: false, text: SECRET, opened: false });
    expect((await onTheDay(`/v1/letters/${id}/open`, ALICE, { method: 'PUT' })).status).toBe(204);
    expect((await (await onTheDay(`/v1/letters/${id}`)).json()).opened).toBe(true);
  });

  it('accepts the app\'s own date within a day of the server, and ignores anything further off', async () => {
    const serverDay = appAt('2026-12-01');
    const [{ id }] = (await (await serverDay('/v1/letters')).json()).letters;
    // A phone still on 30 Nov (west of the server): the letter is still locked for them.
    expect((await (await serverDay(`/v1/letters/${id}?today=2026-11-30`)).json()).locked).toBe(true);
    // A phone claiming a date a year ahead can't peek: it falls back to the server's day.
    const early = appAt('2026-11-02');
    expect((await (await early(`/v1/letters/${id}?today=2027-11-02`)).json()).locked).toBe(true);
  });

  it("records the writer's own day, not the server's, when the app is a day behind", async () => {
    const call = appAt('2026-11-01'); // server is on 1 Nov; the phone is still on 31 Oct
    const made = await (await post(call, { text: 'tz', unlockOn: '2026-12-01', today: '2026-10-31' }, CARA)).json();
    expect(made.writtenOn).toBe('2026-10-31');
  });

  it('rejects unlock dates that are not in the future, or too far away', async () => {
    const call = appAt('2026-11-01');
    expect((await post(call, { text: 'x', unlockOn: '2026-11-01' })).status).toBe(400);
    expect((await post(call, { text: 'x', unlockOn: '2026-10-01' })).status).toBe(400);
    expect((await post(call, { text: 'x', unlockOn: '2040-01-01' })).status).toBe(400);
    expect((await post(call, { text: '   ', unlockOn: '2026-12-01' })).status).toBe(400);
  });

  it("keeps one user's letters from another", async () => {
    const call = appAt('2026-12-05');
    const [{ id }] = (await (await call('/v1/letters')).json()).letters;
    expect((await call(`/v1/letters/${id}`, BOB)).status).toBe(404);
    expect((await call(`/v1/letters/${id}`, BOB, { method: 'DELETE' })).status).toBe(404);
    expect((await (await call('/v1/letters', BOB)).json()).letters).toEqual([]);
  });

  it('lists letters in the data export (locked ones without text) and removes them with the account', async () => {
    const call = appAt('2026-11-02');
    await post(call, { text: 'later', unlockOn: '2027-01-01' });
    const exported = await (await call('/v1/export')).json();
    expect(exported.letters.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(exported.letters)).not.toContain('later');

    expect((await call('/v1/me', ALICE, { method: 'DELETE' })).status).toBe(204);
    expect(await db.select().from(letters).where(eq(letters.userId, ALICE))).toEqual([]);
  });

  it('deletes a single letter', async () => {
    const call = appAt('2026-11-01');
    const made = await (await post(call, { text: 'bye', unlockOn: '2026-12-01' }, BOB)).json();
    expect((await call(`/v1/letters/${made.id}`, BOB, { method: 'DELETE' })).status).toBe(204);
    expect((await call(`/v1/letters/${made.id}`, BOB)).status).toBe(404);
  });
});

describe('effectiveToday', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  it('uses the app\'s day when it is within a day of the server', () => {
    expect(effectiveToday('2026-11-09', now)).toBe('2026-11-09');
    expect(effectiveToday('2026-11-11', now)).toBe('2026-11-11');
    expect(effectiveToday('2026-11-10', now)).toBe('2026-11-10');
  });
  it('falls back to the server day otherwise', () => {
    expect(effectiveToday(undefined, now)).toBe('2026-11-10');
    expect(effectiveToday('2026-11-13', now)).toBe('2026-11-10');
    expect(effectiveToday('not a date', now)).toBe('2026-11-10');
  });
});
