/*
 * Fills ONE account with realistic demo entries, scored by the real Jev model, for trying out the app.
 *   npx tsx --env-file=.env scripts/seed-demo.ts <exact-email> [days]
 *
 * It resolves the user by exact email match and writes only rows with that user's id. Re-running overwrites the
 * same dates for that user and touches nothing else. Today is left unwritten so the write flow can be tried.
 */
import { TypeSafeClient } from '@typesafe-ai/sdk';

import { parseKey } from '../src/crypto';
import { createDb } from '../src/db/client';
import { upsertEntry } from '../src/db/entries-repo';
import { loadEnv } from '../src/env';
import { sealEntry } from '../src/entries-service';
import { createJevClassifier } from '../src/services/jev';
import { createVault } from '../src/vault';

const email = process.argv[2]?.trim().toLowerCase();
const days = Number(process.argv[3] ?? 150);
if (!email || !email.includes('@')) throw new Error('Usage: seed-demo.ts <exact-email> [days]');

const env = loadEnv();
const db = createDb(env.DATABASE_URL);
const vault = createVault(db, parseKey(env.ENTRY_ENCRYPTION_KEY));
const jev = new TypeSafeClient({ apiKey: env.JEV_API_KEY, defaultModel: env.JEV_MODEL, timeout: 30_000 });
const classify = createJevClassifier(async (state, questions) => (await jev.systemOne({ state, questions })).answers);

// ---- find the user (exact email only) ----
const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
  headers: env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_')
    ? { apikey: env.SUPABASE_SERVICE_ROLE_KEY }
    : { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
});
if (!res.ok) throw new Error(`Could not list users (${res.status})`);
const { users } = (await res.json()) as { users: { id: string; email?: string }[] };
const matches = users.filter((u) => u.email?.toLowerCase() === email);
if (matches.length !== 1) throw new Error(`Expected exactly one user with email ${email}, found ${matches.length}`);
const userId = matches[0].id;
const crypto = await vault.forWrite(userId);
console.log(`Seeding ${email} (${userId.slice(0, 8)}…). ${users.length - 1} other account(s) left untouched.`);

// ---- deterministic randomness ----
let seed = 20261020;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const bump = (d: number, c: number, w: number) => Math.exp(-(((d - c) / w) ** 2));
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ---- sentence bank, in the writer's voice ----
const NEUTRAL = [
  'Got up, made coffee, and answered emails until lunch.',
  'Took the train in and read for most of the ride.',
  'Had leftovers for dinner and watched an episode of that baking show.',
  'The laundry finally got done, which felt like a small win.',
  'Rained most of the afternoon, so I stayed in.',
  'Picked up groceries on the way home and cooked something simple.',
  'Work was ordinary today, a few meetings and a long stretch of focused time.',
  'Walked the long way home because the evening was mild.',
  'Spent the evening tidying the flat and putting on a podcast.',
  'Not much happened today, and that was fine.',
];
const MEANING = [
  'Called my sister after dinner and we laughed for an hour; I feel lucky to have her.',
  'Finished the draft I have been circling for weeks, and it actually reads the way I hoped.',
  'Spent the morning on the ridge trail and felt small in the best possible way.',
  'Helped a neighbour carry shopping up the stairs and it made my whole afternoon.',
  'I am proud of how I handled that hard conversation with my manager.',
  'Cooked for friends tonight and the table was loud and warm until midnight.',
  'I keep coming back to how grateful I am for the people around me.',
  'Volunteered at the food bank this morning and it reminded me why I want to do this work.',
  'Sat in the garden with tea and felt genuinely content for the first time in a while.',
  'Wrote three pages in my notebook and remembered how much I love making things.',
  'Taught my cousin to bake bread and watching him enjoy it felt like exactly the right use of a Sunday.',
  'I feel like I am moving toward something that matters to me.',
];
const ANXIOUS = [
  "Couldn't settle today; I kept checking my phone and putting it down again.",
  "My chest felt tight all afternoon thinking about Thursday's deadline.",
  'I keep replaying what I could say in the meeting and it just spirals.',
  'Barely slept last night, my mind racing through everything that could go wrong.',
  'Every notification made my stomach drop in case it was bad news.',
  'I am worried I have not prepared enough and cannot shake the dread.',
  'My shoulders were up around my ears all day and I only noticed at six.',
  'Ran through the same worst-case scenario a dozen times before lunch.',
  'I snapped at the barista and then felt anxious about it for hours.',
  'There is too much to do and I do not know where to start, which makes me panicky.',
];
const LOW = [
  'Nothing felt worth doing today, so I stayed in bed until noon.',
  "I don't see the point of any of it lately.",
  'Everyone else seems to be getting on with their lives and I feel empty and tired.',
  'Cancelled plans again because I could not face people.',
  'Stared at the screen for an hour and could not make myself start.',
  'I feel heavy and flat, like the colour has drained out of everything.',
  'Ate cereal for dinner and went to bed early because there was nothing I wanted to do.',
  'I feel like a burden to the people who keep checking on me.',
  'Even the things I normally enjoy felt grey today.',
  'Woke up exhausted and the day did not get better.',
];

// ---- one mood arc across the period (d = days ago) ----
function mood(d: number) {
  const anx = 0.28 + 0.4 * bump(d, 120, 16) + 0.35 * bump(d, 44, 7) + 0.15 * bump(d, 12, 4);
  const dep = 0.12 + 0.55 * bump(d, 86, 13) + 0.25 * bump(d, 14, 4);
  const mean = 0.55 + 0.15 * Math.sin(d / 9) - 0.25 * bump(d, 86, 13) + 0.2 * bump(d, 3, 6);
  return { anx: clamp01(anx + (rand() - 0.5) * 0.2), dep: clamp01(dep + (rand() - 0.5) * 0.12), mean: clamp01(mean + (rand() - 0.5) * 0.2) };
}

function entryText(d: number): string {
  const m = mood(d);
  const weights = [
    { pool: ANXIOUS, w: m.anx },
    { pool: LOW, w: m.dep },
    { pool: MEANING, w: m.mean * (1 - 0.6 * m.dep) },
    { pool: NEUTRAL, w: 0.3 },
  ];
  const total = weights.reduce((s, x) => s + x.w, 0);
  const n = 3 + Math.floor(rand() * 3);
  const chosen: string[] = [];
  for (let tries = 0; chosen.length < n && tries < 40; tries++) {
    let r = rand() * total;
    const bucket = weights.find((b) => (r -= b.w) <= 0) ?? weights[3];
    const s = pick(bucket.pool);
    if (!chosen.includes(s)) chosen.push(s);
  }
  // A paragraph break now and then, like a real entry.
  if (chosen.length >= 4) chosen.splice(2, 0, '\n\n');
  return chosen.join(' ').replace(/ \n\n /g, '\n\n');
}

// ---- dates (local calendar days, like the app) ----
const pad = (n: number) => String(n).padStart(2, '0');
const keyFor = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Skip ~12% of days for realistic gaps, but keep the most recent 11 days unbroken so there is a live streak.
const plan = Array.from({ length: days }, (_, i) => i + 1)
  .filter((d) => d <= 11 || rand() > 0.12)
  .map((d) => ({ date: keyFor(d), text: entryText(d) }));

// ---- score with the real model and store, a few at a time ----
let done = 0;
async function worker(queue: typeof plan) {
  for (let item = queue.shift(); item; item = queue.shift()) {
    const { scores, highlights, themes, crisis } = await classify(item.text);
    await upsertEntry(db, {
      userId,
      entryDate: item.date,
      scores,
      ...sealEntry(userId, item.date, item.text, highlights, { themes, crisis }, null, crypto),
    });
    if (++done % 20 === 0) console.log(`  ${done}/${plan.length}`);
  }
}
const queue = [...plan];
await Promise.all([worker(queue), worker(queue), worker(queue), worker(queue)]);
console.log(`Done: ${plan.length} entries from ${plan[plan.length - 1].date} to ${plan[0].date}. Today is left unwritten.`);
process.exit(0);
