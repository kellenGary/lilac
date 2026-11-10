import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { cipherVersion, decrypt, encrypt } from './crypto';
import type { Db } from './db/client';
import { userKeys } from './db/schema';

/** Seals and opens strings for one user. Synchronous, because the user's key was fetched when this was made. */
export type UserCrypto = {
  /** Always writes with the user's own key (v2). Not available on a read-only handle. */
  seal(plain: string, aad: string): string;
  /** Opens v1 (master key) and v2 (user key) ciphertexts alike. */
  open(payload: string, aad: string): string;
};

export type Vault = {
  /** For reading. Does not create a key; a user with only old (v1) entries needs none. */
  forRead(userId: string): Promise<UserCrypto>;
  /** For writing. Creates the user's key the first time. */
  forWrite(userId: string): Promise<UserCrypto>;
  /** Erases the user's key. Everything sealed with it becomes permanently unreadable. Safe to repeat. */
  forget(userId: string): Promise<void>;
};

type Options = {
  /** How long an unwrapped key stays in memory. Also how long another server instance may keep using a key after it is erased. */
  ttlMs?: number;
  /** Most users kept in memory at once. */
  maxUsers?: number;
  now?: () => number;
};

// The wrapped key is bound to its owner, so one user's wrapped key cannot be pasted onto another user's row.
const wrapAad = (userId: string) => `user-key:${userId}`;

export function createVault(db: Db, masterKey: Buffer, options: Options = {}): Vault {
  const ttlMs = options.ttlMs ?? 5 * 60_000;
  const maxUsers = options.maxUsers ?? 10_000;
  const now = options.now ?? Date.now;

  // Unwrapped keys, least recently used first. Never logged, never leaves this process.
  const cache = new Map<string, { key: Buffer; at: number }>();
  const creating = new Map<string, Promise<Buffer>>();

  const remember = (userId: string, key: Buffer) => {
    cache.delete(userId);
    cache.set(userId, { key, at: now() });
    if (cache.size > maxUsers) cache.delete(cache.keys().next().value as string);
  };

  const cached = (userId: string): Buffer | null => {
    const hit = cache.get(userId);
    if (!hit) return null;
    if (now() - hit.at > ttlMs) {
      cache.delete(userId);
      return null;
    }
    return hit.key;
  };

  const load = async (userId: string): Promise<Buffer | null> => {
    const [row] = await db.select().from(userKeys).where(eq(userKeys.userId, userId)).limit(1);
    if (!row) return null;
    const key = Buffer.from(decrypt(row.wrappedKey, masterKey, wrapAad(userId)), 'base64');
    remember(userId, key);
    return key;
  };

  const create = async (userId: string): Promise<Buffer> => {
    const fresh = randomBytes(32);
    const wrapped = encrypt(fresh.toString('base64'), masterKey, wrapAad(userId));
    // Two requests can race to create the first key. The loser's insert does nothing and it reads the winner's.
    await db.insert(userKeys).values({ userId, wrappedKey: wrapped }).onConflictDoNothing();
    const key = await load(userId);
    if (!key) throw new Error('Could not create the user key');
    return key;
  };

  const handle = (userId: string, key: Buffer | null): UserCrypto => ({
    seal(plain, aad) {
      if (!key) throw new Error('This handle cannot write');
      return encrypt(plain, key, aad, 'v2');
    },
    open(payload, aad) {
      if (cipherVersion(payload) === 'v1') return decrypt(payload, masterKey, aad);
      if (!key) throw new Error('No key for this user: their data was erased or never written');
      return decrypt(payload, key, aad);
    },
  });

  return {
    async forRead(userId) {
      return handle(userId, cached(userId) ?? (await load(userId)));
    },
    async forWrite(userId) {
      const hit = cached(userId);
      if (hit) return handle(userId, hit);
      let pending = creating.get(userId);
      if (!pending) {
        pending = (async () => (await load(userId)) ?? (await create(userId)))().finally(() => creating.delete(userId));
        creating.set(userId, pending);
      }
      return handle(userId, await pending);
    },
    async forget(userId) {
      cache.delete(userId);
      await db.delete(userKeys).where(eq(userKeys.userId, userId));
    },
  };
}
