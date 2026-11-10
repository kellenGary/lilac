import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// AES-256-GCM. Output: "<version>.<iv>.<tag>.<ciphertext>" (base64 parts).
//   v1: sealed with the server's master key (ENTRY_ENCRYPTION_KEY). Every entry written before per-user keys.
//   v2: sealed with the user's own key (see vault.ts). The user's key is itself stored wrapped by the master key.
// The version tells the vault which key to use. `aad` binds a ciphertext to its row (user + date), so a value copied
// onto another row fails to decrypt.

export type CipherVersion = 'v1' | 'v2';

export function cipherVersion(payload: string): CipherVersion {
  const version = payload.split('.', 1)[0];
  if (version !== 'v1' && version !== 'v2') throw new Error('Unrecognised ciphertext format');
  return version;
}

export function parseKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes');
  return key;
}

export function encrypt(plain: string, key: Buffer, aad: string, version: CipherVersion = 'v1'): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [version, iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join('.');
}

export function decrypt(payload: string, key: Buffer, aad: string): string {
  const [version, iv, tag, body] = payload.split('.');
  if ((version !== 'v1' && version !== 'v2') || !iv || !tag || !body) throw new Error('Unrecognised ciphertext format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8');
}
