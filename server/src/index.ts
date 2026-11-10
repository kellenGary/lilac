import { serve } from '@hono/node-server';
import { TypeSafeClient, type Questions } from '@typesafe-ai/sdk';

import { createApp } from './app';
import { createSupabaseUserDeleter, createSupabaseVerifier } from './auth';
import { parseKey } from './crypto';
import { createDb } from './db/client';
import { loadEnv, parseOrigins } from './env';
import { createJevClassifier, createJevTagger } from './services/jev';
import { createVault } from './vault';

const env = loadEnv();

// One request carries the whole entry plus a question per sentence, so allow more than the 10s default.
const jev = new TypeSafeClient({ apiKey: env.JEV_API_KEY, defaultModel: env.JEV_MODEL, timeout: 30_000 });

const ask = async (state: string, questions: Questions) => (await jev.systemOne({ state, questions })).answers;

const corsOrigins = parseOrigins(env.CORS_ORIGINS);
if (corsOrigins.length === 0) {
  console.warn('CORS_ORIGINS is empty: browsers will block every call from the web app. Set it to your site address.');
}

const db = createDb(env.DATABASE_URL);

const app = createApp({
  db,
  vault: createVault(db, parseKey(env.ENTRY_ENCRYPTION_KEY)),
  verifyToken: createSupabaseVerifier(env.SUPABASE_URL),
  deleteAuthUser: createSupabaseUserDeleter(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  classify: createJevClassifier(ask),
  tag: createJevTagger(ask),
  corsOrigins,
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => console.log(`lilac-server listening on :${port}`));
