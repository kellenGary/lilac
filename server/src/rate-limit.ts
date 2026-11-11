/**
 * Sliding-window rate limiter, held in memory.
 *
 * Fine for a single API instance (the Render blueprint runs one). Counts reset when the process restarts and are not
 * shared between instances, so if the API is ever scaled out, move the counters to Postgres or Redis behind this same
 * interface. The global cap below is the backstop for that case.
 */
export type Rule = { limit: number; windowMs: number };
export type Verdict = { ok: true } | { ok: false; retryAfterSec: number };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type Limits = {
  /** Every request from one IP, checked before the token is. Stops floods of junk and token guessing. */
  ip: Rule[];
  /** Every authenticated request from one user. */
  user: Rule[];
  /** Saving an entry. This is the call that costs money (one Jev request). */
  score: Rule[];
  /** Tagging old entries. One call can make up to 60 Jev requests, so it is much tighter. */
  refresh: Rule[];
  /**
   * All Jev work across all users per day, counted in Jev requests. If bots get past the per-user limits (many
   * accounts), this caps the bill. Set it comfortably above your real daily use.
   */
  globalDaily: number;
};

/**
 * A normal day is about 5 saves. The burst rule allows save-then-fix-a-typo, the hourly rule allows a long session of
 * edits, and the daily rule is several times real use but far below what a script would do.
 */
export const DEFAULT_LIMITS: Limits = {
  ip: [{ limit: 120, windowMs: MINUTE }],
  user: [{ limit: 60, windowMs: MINUTE }],
  score: [
    { limit: 3, windowMs: MINUTE },
    { limit: 12, windowMs: HOUR },
    { limit: 30, windowMs: DAY },
  ],
  refresh: [
    { limit: 5, windowMs: HOUR },
    { limit: 10, windowMs: DAY },
  ],
  globalDaily: 2000,
};

/** What one refresh-insights call is charged against the global cap (it can fan out to many Jev requests). */
export const REFRESH_GLOBAL_COST = 30;

export function createLimiter(rules: Rule[], now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  const longest = Math.max(...rules.map((r) => r.windowMs));
  let lastSweep = now();

  // Drop keys that have gone quiet so memory doesn't grow with every IP ever seen.
  const sweep = (t: number) => {
    if (t - lastSweep < MINUTE) return;
    lastSweep = t;
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] <= t - longest) hits.delete(key);
    }
  };

  return {
    /** Records `cost` hits if every rule allows it; otherwise records nothing and says how long to wait. */
    take(key: string, cost = 1): Verdict {
      const t = now();
      sweep(t);
      const times = (hits.get(key) ?? []).filter((x) => x > t - longest);
      let waitMs = 0;
      for (const rule of rules) {
        const inWindow = times.filter((x) => x > t - rule.windowMs);
        const over = inWindow.length + cost - rule.limit;
        if (over > 0) {
          // The window opens up once the `over` oldest hits age out.
          const idx = Math.min(over, inWindow.length) - 1;
          waitMs = Math.max(waitMs, idx >= 0 ? inWindow[idx] + rule.windowMs - t : rule.windowMs);
        }
      }
      hits.set(key, times);
      if (waitMs > 0) return { ok: false, retryAfterSec: Math.max(1, Math.ceil(waitMs / 1000)) };
      for (let i = 0; i < cost; i++) times.push(t);
      return { ok: true };
    },
    /** Gives back hits for work that never happened (e.g. Jev was down), so an outage doesn't use up a user's quota. */
    refund(key: string, cost = 1) {
      const times = hits.get(key);
      if (times) times.length = Math.max(0, times.length - cost);
    },
  };
}

export type Limiter = ReturnType<typeof createLimiter>;
