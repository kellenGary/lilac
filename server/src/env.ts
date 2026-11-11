import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ENTRY_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64 encoded (openssl rand -base64 32)'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
  JEV_API_KEY: z.string().min(1),
  // Pin a version (e.g. jev-1.13.0) once you have tuned thresholds; aliases like jev-latest move when TypeSafe ships.
  // Hard ceiling on Jev requests per day across all users. Keep it well above real daily use.
  JEV_DAILY_CAP: z.coerce.number().int().positive().default(2000),
  JEV_MODEL: z.string().default('jev-latest'),
});

export type Env = z.infer<typeof schema>;

/**
 * Turns the comma-separated CORS_ORIGINS into clean origins: trims spaces and a trailing slash
 * ("https://site.app/" is not the origin a browser sends), and drops blanks.
 */
export function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${problems}`);
  }
  return parsed.data;
}
