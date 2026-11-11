import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { createSupabaseUserGate, type UserGate } from '../src/auth';
import type { Db } from '../src/db/client';
import * as schema from '../src/db/schema';
import { createVault } from '../src/vault';
import { fakeClassify, fakeTag } from './fake-classifier';

const U = '11111111-1111-4111-8111-111111111111';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('createSupabaseUserGate', () => {
  const gate = (fetchFn: typeof fetch, now = () => 0) => createSupabaseUserGate('https://x.supabase.co', 'sb_secret_k', { fetchFn, now });

  it('accepts a normal user and remembers the answer', async () => {
    const f = vi.fn(async () => json({ id: U, banned_until: null }));
    const g = gate(f as unknown as typeof fetch);
    expect(await g.isActive(U)).toBe(true);
    expect(await g.isActive(U)).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('rejects deleted (404) and banned users', async () => {
    expect(await gate((async () => json({}, 404)) as unknown as typeof fetch).isActive(U)).toBe(false);
    const banned = (async () => json({ banned_until: '2999-01-01T00:00:00Z' })) as unknown as typeof fetch;
    expect(await gate(banned).isActive(U)).toBe(false);
    const expired = (async () => json({ banned_until: '1999-01-01T00:00:00Z' })) as unknown as typeof fetch;
    expect(await gate(expired, () => Date.now()).isActive(U)).toBe(true);
  });

  it('asks again after the cache expires', async () => {
    let t = 0;
    const f = vi.fn(async () => json({}));
    const g = gate(f as unknown as typeof fetch, () => t);
    await g.isActive(U);
    t = 61_000;
    await g.isActive(U);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('lets users through, without caching, when Supabase is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn(async () => Promise.reject(new Error('down')));
    const g = gate(f as unknown as typeof fetch);
    expect(await g.isActive(U)).toBe(true);
    expect(await g.isActive(U)).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('block and unblock override the cache', async () => {
    const g = gate((async () => json({})) as unknown as typeof fetch);
    expect(await g.isActive(U)).toBe(true);
    g.block(U);
    expect(await g.isActive(U)).toBe(false);
    g.unblock(U);
    expect(await g.isActive(U)).toBe(true);
  });
});

describe('API access control', () => {
  let db: Db;
  const key = randomBytes(32);
  beforeAll(async () => {
    const pg = new PGlite();
    const pgDb = drizzle(pg, { schema });
    await migrate(pgDb, { migrationsFolder: 'drizzle' });
    db = pgDb as unknown as Db;
  });

  const make = (userGate?: UserGate, deleteAuthUser = async () => {}) =>
    createApp({
      db,
      vault: createVault(db, key),
      verifyToken: async (tok) => ({ userId: tok.slice(5) }),
      userGate,
      deleteAuthUser,
      classify: fakeClassify,
      tag: fakeTag,
      corsOrigins: ['https://lilac.vercel.app'],
    });
  const as = (extra: Record<string, string> = {}) => ({ Authorization: `Bearer user:${U}`, ...extra });

  it('refuses a deleted or banned user even with a valid token', async () => {
    const app = make({ isActive: async () => false, block: () => {}, unblock: () => {} });
    expect((await app.request('/v1/entries', { headers: as() })).status).toBe(401);
  });

  it('refuses browser calls from sites that are not listed, and allows the listed site and the native app', async () => {
    const app = make();
    expect((await app.request('/v1/entries', { headers: as({ Origin: 'https://evil.example' }) })).status).toBe(403);
    expect((await app.request('/v1/entries', { headers: as({ Origin: 'https://lilac.vercel.app' }) })).status).toBe(200);
    expect((await app.request('/v1/entries', { headers: as() })).status).toBe(200);
  });

  it('locks the user out while deleting, and lets them retry if deletion fails', async () => {
    const calls: string[] = [];
    const gate: UserGate = { isActive: async () => true, block: () => calls.push('block'), unblock: () => calls.push('unblock') };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = make(gate, async () => Promise.reject(new Error('supabase down')));
    expect((await app.request('/v1/me', { method: 'DELETE', headers: as() })).status).toBe(500);
    expect(calls).toEqual(['block', 'unblock']);

    const ok = make(gate);
    calls.length = 0;
    expect((await ok.request('/v1/me', { method: 'DELETE', headers: as() })).status).toBe(204);
    expect(calls).toEqual(['block']); // stays locked once the login is gone
  });
});
