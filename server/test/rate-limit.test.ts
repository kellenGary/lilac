import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import type { Db } from '../src/db/client';
import * as schema from '../src/db/schema';
import { createLimiter } from '../src/rate-limit';
import { createVault } from '../src/vault';
import { fakeClassify, fakeTag } from './fake-classifier';

describe('createLimiter', () => {
  it('allows up to the limit, then says how long to wait', () => {
    let t = 0;
    const l = createLimiter([{ limit: 2, windowMs: 1000 }], () => t);
    expect(l.take('a').ok).toBe(true);
    t = 100;
    expect(l.take('a').ok).toBe(true);
    expect(l.take('a')).toEqual({ ok: false, retryAfterSec: 1 });
    expect(l.take('b').ok).toBe(true); // separate keys don't share
    t = 1001; // first hit has aged out
    expect(l.take('a').ok).toBe(true);
  });

  it('enforces every rule, and a refused request is not counted', () => {
    let t = 0;
    const l = createLimiter([{ limit: 2, windowMs: 1000 }, { limit: 3, windowMs: 10_000 }], () => t);
    for (const at of [0, 1100, 2200]) {
      t = at;
      expect(l.take('a').ok).toBe(true);
    }
    t = 3300;
    const v = l.take('a');
    expect(v.ok).toBe(false);
    expect(v).toMatchObject({ retryAfterSec: 7 }); // oldest hit leaves the 10s window at t=10000, 6.7s away
    t = 10_001;
    expect(l.take('a').ok).toBe(true);
  });

  it('refund gives hits back', () => {
    const l = createLimiter([{ limit: 1, windowMs: 1000 }], () => 0);
    expect(l.take('a').ok).toBe(true);
    l.refund('a');
    expect(l.take('a').ok).toBe(true);
  });
});

describe('rate limits on the API', () => {
  let db: Db;
  const key = randomBytes(32);
  const U1 = '11111111-1111-4111-8111-111111111111';
  const U2 = '22222222-2222-4222-8222-222222222222';
  let t = new Date('2026-10-20T12:00:00Z').getTime();

  beforeAll(async () => {
    const pg = new PGlite();
    const pgDb = drizzle(pg, { schema });
    await migrate(pgDb, { migrationsFolder: 'drizzle' });
    db = pgDb as unknown as Db;
  });

  const make = (over: Partial<Parameters<typeof createApp>[0]> = {}) => {
    const classify = vi.fn(fakeClassify);
    const app = createApp({
      db,
      vault: createVault(db, key),
      verifyToken: async (tok) => ({ userId: tok.slice(5) }),
      deleteAuthUser: async () => {},
      classify,
      tag: fakeTag,
      corsOrigins: [],
      now: () => new Date(t),
      ...over,
    });
    const req = (path: string, as: string, init: RequestInit = {}) =>
      app.request(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer user:${as}` } });
    const put = (date: string, text: string, as = U1, extra: object = {}) =>
      req(`/v1/entries/${date}`, as, { method: 'PUT', body: JSON.stringify({ text, ...extra }) });
    return { app, req, put, classify };
  };

  it('blocks a burst of saves with 429 and Retry-After, but not other users', async () => {
    const { put } = make();
    for (let i = 0; i < 3; i++) expect((await put('2026-10-01', `entry ${i}`)).status).toBe(200);
    const res = await put('2026-10-01', 'one more');
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(await res.json()).toMatchObject({ error: 'rate_limited' });
    expect((await put('2026-10-01', 'someone else', U2)).status).toBe(200);
  });

  it('does not charge (or call Jev) when only the check-in changes', async () => {
    const { put, classify } = make();
    await put('2026-10-02', 'same words');
    for (let i = 0; i < 10; i++) expect((await put('2026-10-02', 'same words', U1, { feeling: (i % 5) + 1 })).status).toBe(200);
    expect(classify).toHaveBeenCalledTimes(1);
  });

  it('does not use up quota when scoring fails', async () => {
    const down = vi.fn(async () => Promise.reject(new Error('jev down')));
    const { put } = make({ classify: down });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (let i = 0; i < 6; i++) expect((await put('2026-10-03', `try ${i}`)).status).toBe(502);
  });

  it('stops everyone once the global daily cap is hit', async () => {
    const { put } = make({ limits: { globalDaily: 2 } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await put('2026-10-04', 'a', U1)).status).toBe(200);
    expect((await put('2026-10-04', 'b', U2)).status).toBe(200);
    const res = await put('2026-10-05', 'c', U1);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'busy' });
  });

  it('limits refresh-insights tightly', async () => {
    const { req } = make();
    for (let i = 0; i < 5; i++) expect((await req('/v1/refresh-insights', U1, { method: 'POST' })).status).toBe(200);
    expect((await req('/v1/refresh-insights', U1, { method: 'POST' })).status).toBe(429);
  });

  it('limits floods from one IP before checking the token', async () => {
    const { app } = make({ limits: { ip: [{ limit: 2, windowMs: 60_000 }] } });
    const hit = (ip: string) => app.request('/v1/entries', { headers: { 'x-forwarded-for': `9.9.9.9, ${ip}` } });
    expect((await hit('1.1.1.1')).status).toBe(401);
    expect((await hit('1.1.1.1')).status).toBe(401);
    expect((await hit('1.1.1.1')).status).toBe(429);
    expect((await hit('2.2.2.2')).status).toBe(401);
  });
});
