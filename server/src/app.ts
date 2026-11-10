import { zValidator } from '@hono/zod-validator';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';

import { describeError } from './log';
import type { DeleteAuthUser, VerifyToken } from './auth';
import type { Db } from './db/client';
import { deleteAllEntries, deleteEntry, getEntry, listEntries, upsertEntry } from './db/entries-repo';
import { openEntry, openMeta, sealEntry } from './entries-service';
import { backfillMeta } from './backfill';
import type { Classify, Tag } from './services/jev';
import type { Vault } from './vault';

export type AppDeps = {
  db: Db;
  /** Holds each user's encryption key. */
  vault: Vault;
  verifyToken: VerifyToken;
  deleteAuthUser: DeleteAuthUser;
  classify: Classify;
  tag: Tag;
  corsOrigins: string[];
  now?: () => Date;
};

type Vars = { Variables: { userId: string } };

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'not a real date');

const MAX_TEXT = 20_000;

export function createApp(deps: AppDeps) {
  const { db, vault, verifyToken, deleteAuthUser, classify, tag } = deps;
  const now = deps.now ?? (() => new Date());
  const app = new Hono<Vars>();

  app.use(secureHeaders());
  app.use(
    cors({
      origin: deps.corsOrigins,
      allowMethods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type'],
    }),
  );

  // Touches the database so an uptime pinger also keeps the Supabase project from pausing.
  app.get('/health', async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false }, 503);
    }
  });

  app.use('/v1/*', async (c, next) => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return c.json({ error: 'unauthorized' }, 401);
    try {
      c.set('userId', (await verifyToken(token)).userId);
    } catch {
      return c.json({ error: 'unauthorized' }, 401);
    }
    await next();
  });

  app.get('/v1/entries', zValidator('query', z.object({ from: dateKey.optional(), to: dateKey.optional() })), async (c) => {
    const userId = c.get('userId');
    const rows = await listEntries(db, userId, c.req.valid('query'));
    const crypto = await vault.forRead(userId);
    return c.json({ entries: rows.map((r) => openEntry(r, crypto)) });
  });

  app.get('/v1/entries/:date', zValidator('param', z.object({ date: dateKey })), async (c) => {
    const userId = c.get('userId');
    const row = await getEntry(db, userId, c.req.valid('param').date);
    return row ? c.json(openEntry(row, await vault.forRead(userId))) : c.json({ error: 'not found' }, 404);
  });

  // Create or edit. Either way the text is (re-)scored, so scores always match what was written.
  app.put(
    '/v1/entries/:date',
    zValidator('param', z.object({ date: dateKey })),
    zValidator(
      'json',
      z.object({
        text: z.string().trim().min(1).max(MAX_TEXT),
        // Omit to keep what was chosen before (editing text must not wipe a check-in); null clears it.
        feeling: z.number().int().min(1).max(5).nullable().optional(),
      }),
    ),
    async (c) => {
      const userId = c.get('userId');
      const { date } = c.req.valid('param');
      const { text, feeling: chosen } = c.req.valid('json');

      // The server doesn't know the user's timezone, so allow one day ahead of UTC and no more.
      const latest = new Date(now().getTime() + 86_400_000).toISOString().slice(0, 10);
      if (date > latest) return c.json({ error: 'date is in the future' }, 400);

      let classification;
      try {
        classification = await classify(text);
      } catch (err) {
        // Nothing is saved, so the user can simply try again. Never log the text itself.
        console.error(`scoring failed:\n${describeError(err)}`);
        return c.json({ error: 'scoring_unavailable' }, 502);
      }
      const crypto = await vault.forWrite(userId);
      const existing = await getEntry(db, userId, date);
      const feeling = chosen !== undefined ? chosen : existing ? openMeta(existing, crypto).feeling : null;
      const { scores, highlights, themes, crisis } = classification;
      const row = await upsertEntry(db, {
        userId,
        entryDate: date,
        scores,
        ...sealEntry(userId, date, text, highlights, { themes, crisis }, feeling, crypto),
      });
      return c.json(openEntry(row, crypto));
    },
  );

  app.delete('/v1/entries/:date', zValidator('param', z.object({ date: dateKey })), async (c) => {
    const removed = await deleteEntry(db, c.get('userId'), c.req.valid('param').date);
    return removed ? c.body(null, 204) : c.json({ error: 'not found' }, 404);
  });

  // Tag older entries with themes and the crisis check. Call again while `more` is true.
  app.post('/v1/refresh-insights', async (c) => {
    try {
      const userId = c.get('userId');
      return c.json(await backfillMeta(db, userId, await vault.forWrite(userId), tag));
    } catch (err) {
      console.error(`refresh failed:\n${describeError(err)}`);
      return c.json({ error: 'scoring_unavailable' }, 502);
    }
  });

  // Everything we hold about the user, as JSON.
  app.get('/v1/export', async (c) => {
    const userId = c.get('userId');
    const rows = await listEntries(db, userId);
    const crypto = await vault.forRead(userId);
    c.header('Content-Disposition', 'attachment; filename="lilac-pages-export.json"');
    return c.json({ exportedAt: now().toISOString(), entries: rows.map((r) => openEntry(r, crypto)) });
  });

  // Account deletion: entries, then the user's encryption key (so any copy of their data, in backups too, can never
  // be read again), then the login. Every step is safe to repeat if a later one fails.
  app.delete('/v1/me', async (c) => {
    const userId = c.get('userId');
    await deleteAllEntries(db, userId);
    await vault.forget(userId);
    await deleteAuthUser(userId);
    return c.body(null, 204);
  });

  // Never log request bodies: they contain journal text.
  app.onError((err, c) => {
    const user = c.get('userId')?.slice(0, 8) ?? 'anon';
    console.error(`${c.req.method} ${c.req.path} failed (user ${user}):\n${describeError(err)}`);
    return c.json({ error: 'internal error' }, 500);
  });

  return app;
}
