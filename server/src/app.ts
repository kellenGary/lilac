import { zValidator } from '@hono/zod-validator';
import { sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { describeError } from './log';
import type { DeleteAuthUser, UserGate, VerifyToken } from './auth';
import type { Db } from './db/client';
import { deleteAllEntries, deleteEntry, getEntry, listEntries, upsertEntry } from './db/entries-repo';
import { openEntry, openMeta, sealEntry } from './entries-service';
import { backfillMeta } from './backfill';
import { countLetters, deleteAllLetters, deleteLetter, getLetter, insertLetter, listLetters, markOpened } from './db/letters-repo';
import { effectiveToday, sealLetter, viewLetter } from './letters-service';
import {
  countTasks,
  deleteAllTasks,
  deleteMark,
  deleteTask,
  getTask,
  insertTask,
  listMarks,
  listTasks,
  setExperiment,
  upsertMark,
} from './db/tasks-repo';
import { sealTitle, viewMark, viewTask } from './tasks-service';
import { THEMES } from './services/jev';
import { createLimiter, DEFAULT_LIMITS, REFRESH_GLOBAL_COST, type Limits } from './rate-limit';
import type { Classify, Tag } from './services/jev';
import type { Vault } from './vault';

export type AppDeps = {
  db: Db;
  /** Holds each user's encryption key. */
  vault: Vault;
  verifyToken: VerifyToken;
  /** Rejects tokens of deleted or banned users. Left out, every verified token is accepted. */
  userGate?: UserGate;
  deleteAuthUser: DeleteAuthUser;
  classify: Classify;
  tag: Tag;
  corsOrigins: string[];
  /** Rate limits; any left out use DEFAULT_LIMITS. */
  limits?: Partial<Limits>;
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

  const limits = { ...DEFAULT_LIMITS, ...deps.limits };
  const clock = () => now().getTime();
  const ipLimit = createLimiter(limits.ip, clock);
  const userLimit = createLimiter(limits.user, clock);
  const scoreLimit = createLimiter(limits.score, clock);
  const refreshLimit = createLimiter(limits.refresh, clock);
  const globalLimit = createLimiter([{ limit: limits.globalDaily, windowMs: 86_400_000 }], clock);

  const tooMany = (c: Context, retryAfterSec: number, error = 'rate_limited') => {
    c.header('Retry-After', String(retryAfterSec));
    return c.json({ error, retryAfter: retryAfterSec }, error === 'rate_limited' ? 429 : 503);
  };

  /**
   * Charges one Jev-backed action to the user's own limit and to the global daily cap. Returns a response to send back
   * if either is used up, or a function that gives the charge back if the Jev work then fails.
   */
  const chargeJev = (c: Context, userId: string, own: ReturnType<typeof createLimiter>, globalCost: number) => {
    const mine = own.take(userId);
    if (!mine.ok) return { blocked: tooMany(c, mine.retryAfterSec) };
    const all = globalLimit.take('all', globalCost);
    if (!all.ok) {
      own.refund(userId);
      console.error('daily Jev cap reached');
      return { blocked: tooMany(c, all.retryAfterSec, 'busy') };
    }
    return {
      refund: () => {
        own.refund(userId);
        globalLimit.refund('all', globalCost);
      },
    };
  };

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

  // Browsers always send Origin, the native app never does. A browser call from a site we don't list is refused
  // outright (CORS alone only stops the page from reading the answer, not the request from being made).
  app.use('/v1/*', async (c, next) => {
    const origin = c.req.header('Origin');
    if (origin && !deps.corsOrigins.includes(origin)) return c.json({ error: 'forbidden' }, 403);
    await next();
  });

  // Per-IP flood limit, before any token work. Render's proxy adds the real client address as the last entry.
  app.use('/v1/*', async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
    const verdict = ipLimit.take(ip);
    return verdict.ok ? next() : tooMany(c, verdict.retryAfterSec);
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
    if (deps.userGate && !(await deps.userGate.isActive(c.get('userId')))) return c.json({ error: 'unauthorized' }, 401);
    const verdict = userLimit.take(c.get('userId'));
    if (!verdict.ok) return tooMany(c, verdict.retryAfterSec);
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

      const crypto = await vault.forWrite(userId);
      const existing = await getEntry(db, userId, date);
      const feeling = chosen !== undefined ? chosen : existing ? openMeta(existing, crypto).feeling : null;

      // Saving the same words again (e.g. only the check-in changed) needs no new scoring, so it costs nothing and
      // doesn't count against the limits.
      if (existing) {
        const previous = openEntry(existing, crypto);
        if (previous.text === text) {
          const row = await upsertEntry(db, {
            userId,
            entryDate: date,
            scores: previous.scores,
            ...sealEntry(userId, date, text, previous.highlights, { themes: previous.themes, crisis: previous.crisis }, feeling, crypto),
          });
          return c.json(openEntry(row, crypto));
        }
      }

      const charge = chargeJev(c, userId, scoreLimit, 1);
      if (charge.blocked) return charge.blocked;

      let classification;
      try {
        classification = await classify(text);
      } catch (err) {
        // Nothing is saved, so the user can simply try again (and the attempt doesn't count). Never log the text itself.
        charge.refund();
        console.error(`scoring failed:\n${describeError(err)}`);
        return c.json({ error: 'scoring_unavailable' }, 502);
      }
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

  // Letters to future self. A locked letter's text is never returned, so the app can't be used to read it early.
  const MAX_LETTERS = 50;
  const YEAR_MS = 366 * 86_400_000 * 5;
  const letterId = z.object({ id: z.string().uuid() });
  const todayQuery = z.object({ today: dateKey.optional() });

  app.get('/v1/letters', zValidator('query', todayQuery), async (c) => {
    const userId = c.get('userId');
    const today = effectiveToday(c.req.valid('query').today, now());
    const rows = await listLetters(db, userId);
    const crypto = await vault.forRead(userId);
    return c.json({ letters: rows.map((r) => viewLetter(r, today, crypto)) });
  });

  app.get('/v1/letters/:id', zValidator('param', letterId), zValidator('query', todayQuery), async (c) => {
    const userId = c.get('userId');
    const row = await getLetter(db, userId, c.req.valid('param').id);
    if (!row) return c.json({ error: 'not found' }, 404);
    const today = effectiveToday(c.req.valid('query').today, now());
    return c.json(viewLetter(row, today, await vault.forRead(userId)));
  });

  app.post(
    '/v1/letters',
    zValidator('json', z.object({ text: z.string().trim().min(1).max(MAX_TEXT), unlockOn: dateKey, today: dateKey.optional() })),
    async (c) => {
      const userId = c.get('userId');
      const { text, unlockOn, today: clientToday } = c.req.valid('json');
      const today = effectiveToday(clientToday, now());
      if (unlockOn <= today) return c.json({ error: 'unlock date must be in the future' }, 400);
      if (Date.parse(`${unlockOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`) > YEAR_MS) {
        return c.json({ error: 'unlock date is too far away' }, 400);
      }
      if ((await countLetters(db, userId)) >= MAX_LETTERS) return c.json({ error: 'too many letters' }, 409);
      const id = randomUUID();
      const crypto = await vault.forWrite(userId);
      const row = await insertLetter(db, {
        id,
        userId,
        textEnc: sealLetter(userId, id, text, crypto),
        writtenOn: today,
        unlockOn,
        createdAt: now(),
      });
      return c.json(viewLetter(row, today, crypto), 201);
    },
  );

  // Records that the writer has read it, once it has unlocked.
  app.put('/v1/letters/:id/open', zValidator('param', letterId), zValidator('query', todayQuery), async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    const row = await getLetter(db, userId, id);
    if (!row) return c.json({ error: 'not found' }, 404);
    const today = effectiveToday(c.req.valid('query').today, now());
    if (row.unlockOn > today) return c.json({ error: 'still locked' }, 403);
    await markOpened(db, userId, id);
    return c.body(null, 204);
  });

  app.delete('/v1/letters/:id', zValidator('param', letterId), async (c) => {
    const removed = await deleteLetter(db, c.get('userId'), c.req.valid('param').id);
    return removed ? c.body(null, 204) : c.json({ error: 'not found' }, 404);
  });

  // To-do list: daily habits and one-off items, with a tick per day (and optionally how it felt). Titles are encrypted.
  const MAX_TASKS = 60;
  const EXPERIMENT_DAYS = 14;
  const themeKeys = THEMES.map((t) => t.key) as [string, ...string[]];
  const taskId = z.object({ id: z.string().uuid() });
  const markParams = z.object({ id: z.string().uuid(), day: dateKey });
  const dayInReach = (day: string, today: string) => {
    const ms = Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
    return ms <= 86_400_000 && ms >= -7 * 86_400_000; // a week back is enough to fix a missed tick; one day ahead covers time zones
  };

  app.get('/v1/tasks', async (c) => {
    const userId = c.get('userId');
    const [rows, marks] = await Promise.all([listTasks(db, userId), listMarks(db, userId)]);
    const crypto = await vault.forRead(userId);
    return c.json({ tasks: rows.map((r) => viewTask(r, crypto)), marks: marks.map(viewMark) });
  });

  app.post(
    '/v1/tasks',
    zValidator(
      'json',
      z.object({
        title: z.string().trim().min(1).max(120),
        kind: z.enum(['daily', 'once']),
        theme: z.enum(themeKeys).nullable().optional(),
        today: dateKey.optional(),
      }),
    ),
    async (c) => {
      const userId = c.get('userId');
      const { title, kind, theme, today: clientToday } = c.req.valid('json');
      const today = effectiveToday(clientToday, now());
      if ((await countTasks(db, userId)) >= MAX_TASKS) return c.json({ error: 'too many items' }, 409);
      const id = randomUUID();
      const crypto = await vault.forWrite(userId);
      const row = await insertTask(db, {
        id,
        userId,
        titleEnc: sealTitle(userId, id, title, crypto),
        kind,
        theme: theme ?? null,
        createdOn: today,
        onDate: kind === 'once' ? today : null,
      });
      return c.json(viewTask(row, crypto), 201);
    },
  );

  app.delete('/v1/tasks/:id', zValidator('param', taskId), async (c) => {
    const removed = await deleteTask(db, c.get('userId'), c.req.valid('param').id);
    return removed ? c.body(null, 204) : c.json({ error: 'not found' }, 404);
  });

  // Start a two-week experiment on a habit, or stop it.
  app.put(
    '/v1/tasks/:id/experiment',
    zValidator('param', taskId),
    zValidator('json', z.object({ today: dateKey.optional() })),
    async (c) => {
      const userId = c.get('userId');
      const { id } = c.req.valid('param');
      const task = await getTask(db, userId, id);
      if (!task) return c.json({ error: 'not found' }, 404);
      if (task.kind !== 'daily') return c.json({ error: 'only habits can be experiments' }, 400);
      const today = effectiveToday(c.req.valid('json').today, now());
      await setExperiment(db, userId, id, today, EXPERIMENT_DAYS);
      return c.body(null, 204);
    },
  );
  app.delete('/v1/tasks/:id/experiment', zValidator('param', taskId), async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');
    if (!(await getTask(db, userId, id))) return c.json({ error: 'not found' }, 404);
    await setExperiment(db, userId, id, null, null);
    return c.body(null, 204);
  });

  app.put(
    '/v1/tasks/:id/marks/:day',
    zValidator('param', markParams),
    zValidator('json', z.object({ mood: z.number().int().min(1).max(5).nullable().optional(), today: dateKey.optional() })),
    async (c) => {
      const userId = c.get('userId');
      const { id, day } = c.req.valid('param');
      const { mood, today: clientToday } = c.req.valid('json');
      if (!(await getTask(db, userId, id))) return c.json({ error: 'not found' }, 404);
      if (!dayInReach(day, effectiveToday(clientToday, now()))) return c.json({ error: 'day is out of range' }, 400);
      await upsertMark(db, { taskId: id, userId, day, mood: mood ?? null });
      return c.body(null, 204);
    },
  );
  app.delete('/v1/tasks/:id/marks/:day', zValidator('param', markParams), async (c) => {
    const { id, day } = c.req.valid('param');
    await deleteMark(db, c.get('userId'), id, day);
    return c.body(null, 204);
  });

  // Tag older entries with themes and the crisis check. Call again while `more` is true.
  app.post('/v1/refresh-insights', async (c) => {
    const userId = c.get('userId');
    const charge = chargeJev(c, userId, refreshLimit, REFRESH_GLOBAL_COST);
    if (charge.blocked) return charge.blocked;
    try {
      return c.json(await backfillMeta(db, userId, await vault.forWrite(userId), tag));
    } catch (err) {
      charge.refund();
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
    const today = effectiveToday(undefined, now());
    const letterRows = await listLetters(db, userId);
    const [taskRows, markRows] = await Promise.all([listTasks(db, userId), listMarks(db, userId)]);
    return c.json({
      exportedAt: now().toISOString(),
      entries: rows.map((r) => openEntry(r, crypto)),
      tasks: taskRows.map((r) => viewTask(r, crypto)),
      taskMarks: markRows.map(viewMark),
      // The export is everything we hold, so a letter that hasn't unlocked yet is listed without its text.
      letters: letterRows.map((r) => viewLetter(r, today, crypto)),
    });
  });

  // Account deletion: entries, then the user's encryption key (so any copy of their data, in backups too, can never
  // be read again), then the login. The user is locked out first so another device can't write new entries while this
  // runs. A failure part-way leaves them able to sign in and press delete again; every step is safe to repeat.
  app.delete('/v1/me', async (c) => {
    const userId = c.get('userId');
    deps.userGate?.block(userId);
    try {
      await deleteAllEntries(db, userId);
      await deleteAllLetters(db, userId);
      await deleteAllTasks(db, userId);
      await vault.forget(userId);
      await deleteAuthUser(userId);
    } catch (err) {
      deps.userGate?.unblock(userId);
      throw err;
    }
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
