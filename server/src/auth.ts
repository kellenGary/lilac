import { createRemoteJWKSet, jwtVerify } from 'jose';

/** Verifies a bearer token and returns the user's id, or throws. */
export type VerifyToken = (token: string) => Promise<{ userId: string }>;

/**
 * Verifies Supabase access tokens against the project's public signing keys (JWKS).
 * Needs a project using asymmetric JWT signing keys (the current default). A project still on the
 * legacy shared secret would need an HS256 verifier instead.
 */
export function createSupabaseVerifier(supabaseUrl: string): VerifyToken {
  const issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: 'authenticated' });
    if (!payload.sub) throw new Error('Token has no subject');
    return { userId: payload.sub };
  };
}

/** Deletes the login itself (Supabase admin API). Called when a user deletes their account. */
export type DeleteAuthUser = (userId: string) => Promise<void>;

export function createSupabaseUserDeleter(supabaseUrl: string, serviceRoleKey: string): DeleteAuthUser {
  return async (userId) => {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      // New-style secret keys (sb_secret_...) are not JWTs and go in `apikey` only; legacy service_role keys are JWTs.
      headers: serviceRoleKey.startsWith('sb_secret_')
        ? { apikey: serviceRoleKey }
        : { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!res.ok && res.status !== 404) throw new Error(`Supabase user delete failed (${res.status})`);
  };
}

/**
 * Decides whether a user may still use the API. A valid token alone isn't enough: tokens live for about an hour, so
 * a deleted or banned user would otherwise keep working until theirs expires.
 */
export type UserGate = {
  isActive: (userId: string) => Promise<boolean>;
  /** Locks a user out right away (used while their account is being deleted). */
  block: (userId: string) => void;
  /** Undoes `block`, e.g. when a deletion failed and they need to retry. */
  unblock: (userId: string) => void;
};

/**
 * Asks Supabase (admin API) whether the user still exists and isn't banned, remembering the answer briefly so this
 * is one extra request per user per `ttlMs`, not per call. If Supabase can't be reached the user is let through (their
 * token is already verified, and an outage there shouldn't take the journal offline) and the failure is not cached.
 * Counts are in memory, so they apply to this process only.
 */
export function createSupabaseUserGate(
  supabaseUrl: string,
  serviceRoleKey: string,
  { ttlMs = 60_000, now = Date.now, fetchFn = fetch }: { ttlMs?: number; now?: () => number; fetchFn?: typeof fetch } = {},
): UserGate {
  const base = supabaseUrl.replace(/\/$/, '');
  const blocked = new Set<string>();
  const cache = new Map<string, { active: boolean; until: number }>();
  const headers: Record<string, string> = serviceRoleKey.startsWith('sb_secret_')
    ? { apikey: serviceRoleKey }
    : { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  return {
    block: (userId) => {
      blocked.add(userId);
      cache.delete(userId);
    },
    unblock: (userId) => {
      blocked.delete(userId);
      cache.delete(userId);
    },
    async isActive(userId) {
      if (blocked.has(userId)) return false;
      const t = now();
      const hit = cache.get(userId);
      if (hit && hit.until > t) return hit.active;
      try {
        const res = await fetchFn(`${base}/auth/v1/admin/users/${userId}`, { headers });
        if (res.status === 404) return remember(false);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const user = (await res.json()) as { banned_until?: string | null };
        const banned = user.banned_until ? new Date(user.banned_until).getTime() > t : false;
        return remember(!banned);
      } catch (err) {
        console.error(`user check failed, letting the request through: ${err instanceof Error ? err.message : err}`);
        return true;
      }
      function remember(active: boolean) {
        if (cache.size > 10_000) cache.clear();
        cache.set(userId, { active, until: t + ttlMs });
        return active;
      }
    },
  };
}
