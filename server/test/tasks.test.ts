import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import type { Db } from '../src/db/client';
import { taskMarks, tasks } from '../src/db/schema';
import * as schema from '../src/db/schema';
import { createVault } from '../src/vault';
import { fakeClassify, fakeTag } from './fake-classifier';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const CARA = '33333333-3333-4333-8333-333333333333';
const TODAY = '2026-11-18';

let db: Db;
const key = randomBytes(32);
beforeAll(async () => {
  const pg = new PGlite();
  const pgDb = drizzle(pg, { schema });
  await migrate(pgDb, { migrationsFolder: 'drizzle' });
  db = pgDb as unknown as Db;
});

const call = (path: string, as = ALICE, init: RequestInit = {}) =>
  makeApp().request(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer user:${as}` } });
let cached: ReturnType<typeof createApp> | null = null;
function makeApp() {
  cached ??= createApp({
    db,
    vault: createVault(db, key),
    verifyToken: async (tok) => ({ userId: tok.slice(5) }),
    deleteAuthUser: async () => {},
    classify: fakeClassify,
    tag: fakeTag,
    corsOrigins: [],
    now: () => new Date(`${TODAY}T12:00:00Z`),
    limits: { user: [{ limit: 100000, windowMs: 60_000 }], ip: [{ limit: 100000, windowMs: 60_000 }] },
  });
  return cached;
}
const add = (body: object, as = ALICE) => call('/v1/tasks', as, { method: 'POST', body: JSON.stringify(body) });
const tick = (id: string, day: string, body: object = {}, as = ALICE) =>
  call(`/v1/tasks/${id}/marks/${day}`, as, { method: 'PUT', body: JSON.stringify(body) });

describe('to-do list', () => {
  it('adds a daily habit and a one-off, with titles encrypted at rest', async () => {
    const h = await add({ title: 'Walk outside for 15 minutes', kind: 'daily', theme: 'outdoors', today: TODAY });
    expect(h.status).toBe(201);
    const habit = await h.json();
    expect(habit).toMatchObject({ title: 'Walk outside for 15 minutes', kind: 'daily', theme: 'outdoors', createdOn: TODAY, onDate: null, experiment: null });
    const o = await (await add({ title: 'Book the dentist', kind: 'once', today: TODAY })).json();
    expect(o).toMatchObject({ kind: 'once', onDate: TODAY, theme: null });

    const rows = await db.select().from(tasks).where(eq(tasks.userId, ALICE));
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.titleEnc).not.toMatch(/Walk|dentist/);

    const list = await (await call('/v1/tasks')).json();
    expect(list.tasks.map((t: { title: string }) => t.title).sort()).toEqual(['Book the dentist', 'Walk outside for 15 minutes']);
  });

  it('rejects bad input', async () => {
    expect((await add({ title: '  ', kind: 'daily' })).status).toBe(400);
    expect((await add({ title: 'x', kind: 'weekly' })).status).toBe(400);
    expect((await add({ title: 'x', kind: 'daily', theme: 'not-a-theme' })).status).toBe(400);
    expect((await add({ title: 'x'.repeat(121), kind: 'daily' })).status).toBe(400);
  });

  it('ticks a day, records how it felt, and unticks', async () => {
    const { tasks: list } = await (await call('/v1/tasks')).json();
    const habit = list.find((t: { kind: string }) => t.kind === 'daily');
    expect((await tick(habit.id, '2026-11-17')).status).toBe(204);
    expect((await tick(habit.id, '2026-11-17', { mood: 4 })).status).toBe(204); // same day again: updates, never duplicates
    expect((await tick(habit.id, TODAY)).status).toBe(204);
    let { marks } = await (await call('/v1/tasks')).json();
    expect(marks).toEqual(expect.arrayContaining([
      { taskId: habit.id, day: '2026-11-17', mood: 4 },
      { taskId: habit.id, day: TODAY, mood: null },
    ]));
    expect(marks).toHaveLength(2);
    expect((await call(`/v1/tasks/${habit.id}/marks/${TODAY}`, ALICE, { method: 'DELETE' })).status).toBe(204);
    ({ marks } = await (await call('/v1/tasks')).json());
    expect(marks).toHaveLength(1);
  });

  it('limits which days can be ticked, and the mood range', async () => {
    const { tasks: list } = await (await call('/v1/tasks')).json();
    const id = list[0].id;
    expect((await tick(id, '2026-11-09')).status).toBe(400); // more than a week back
    expect((await tick(id, '2026-11-25')).status).toBe(400); // days ahead
    expect((await tick(id, '2026-11-19')).status).toBe(204); // tomorrow in another time zone
    expect((await tick(id, TODAY, { mood: 6 })).status).toBe(400);
    expect((await tick('99999999-9999-4999-8999-999999999999', TODAY)).status).toBe(404);
  });

  it("keeps one user's list and ticks from another", async () => {
    const { tasks: list } = await (await call('/v1/tasks')).json();
    const id = list[0].id;
    expect((await (await call('/v1/tasks', BOB)).json())).toEqual({ tasks: [], marks: [] });
    expect((await tick(id, TODAY, {}, BOB)).status).toBe(404);
    expect((await call(`/v1/tasks/${id}`, BOB, { method: 'DELETE' })).status).toBe(404);
    expect((await call(`/v1/tasks/${id}/experiment`, BOB, { method: 'PUT', body: '{}' })).status).toBe(404);
  });

  it('starts and stops a two-week experiment on a habit only', async () => {
    const { tasks: list } = await (await call('/v1/tasks')).json();
    const habit = list.find((t: { kind: string }) => t.kind === 'daily');
    const once = list.find((t: { kind: string }) => t.kind === 'once');
    expect((await call(`/v1/tasks/${habit.id}/experiment`, ALICE, { method: 'PUT', body: JSON.stringify({ today: TODAY }) })).status).toBe(204);
    expect((await call(`/v1/tasks/${once.id}/experiment`, ALICE, { method: 'PUT', body: '{}' })).status).toBe(400);
    let after = (await (await call('/v1/tasks')).json()).tasks.find((t: { id: string }) => t.id === habit.id);
    expect(after.experiment).toEqual({ start: TODAY, days: 14 });
    expect((await call(`/v1/tasks/${habit.id}/experiment`, ALICE, { method: 'DELETE' })).status).toBe(204);
    after = (await (await call('/v1/tasks')).json()).tasks.find((t: { id: string }) => t.id === habit.id);
    expect(after.experiment).toBeNull();
  });

  it('caps the list size', async () => {
    for (let i = 0; i < 60; i++) {
      const res = await add({ title: `item ${i}`, kind: 'once', today: TODAY }, CARA);
      expect(res.status).toBe(201);
    }
    expect((await add({ title: 'one too many', kind: 'once' }, CARA)).status).toBe(409);
  });

  it('deleting an item removes its ticks; the export includes both; deleting the account removes everything', async () => {
    const { tasks: list } = await (await call('/v1/tasks')).json();
    const habit = list.find((t: { kind: string }) => t.kind === 'daily');
    const exported = await (await call('/v1/export')).json();
    expect(exported.tasks.length).toBe(list.length);
    expect(exported.taskMarks.length).toBeGreaterThan(0);

    expect((await call(`/v1/tasks/${habit.id}`, ALICE, { method: 'DELETE' })).status).toBe(204);
    expect(await db.select().from(taskMarks).where(eq(taskMarks.taskId, habit.id))).toEqual([]);

    expect((await call('/v1/me', ALICE, { method: 'DELETE' })).status).toBe(204);
    expect(await db.select().from(tasks).where(eq(tasks.userId, ALICE))).toEqual([]);
    expect(await db.select().from(taskMarks).where(eq(taskMarks.userId, ALICE))).toEqual([]);
  });
});
