# lilac-server

TypeScript API for the Lilac Pages app: Hono, Postgres (Drizzle), Supabase Auth.

```
app (Expo)  --Bearer <Supabase access token>-->  this API  -->  Postgres (Supabase)
                                                     |-->  Jev (TypeSafe) for scoring
```

## Setup
1. Create a Supabase project. Note the project URL, the service role key, and the database connection string.
2. `cp .env.example .env` and fill it in. Generate the encryption key with `openssl rand -base64 32` and back it up
   outside the database: losing it makes every stored entry unreadable.
3. `npm install`, then `npm run db:migrate` (creates `entries` and `user_keys` and turns on row-level security).
4. `npm run dev` (http://localhost:8787).

`npm test` runs the suite against an in-process Postgres (no setup needed). `npm run typecheck` checks types.

## API (all under `/v1`, `Authorization: Bearer <token>`)
| | |
|---|---|
| `GET /v1/entries?from=&to=` | List entries (oldest first), decrypted |
| `GET /v1/entries/:date` | One entry (`YYYY-MM-DD`) |
| `PUT /v1/entries/:date` `{ text }` | Create or edit. Always re-scored |
| `DELETE /v1/entries/:date` | Delete one entry |
| `GET /v1/export` | All of the user's data as JSON |
| `DELETE /v1/me` | Delete all entries, then the login |

Entry JSON matches the app's `Entry` type: `{ date, text, scores: { depression, anxiety, meaning }, highlights: [{ text, signal }] }`.

## Scoring (Jev)
`src/services/jev.ts` sends one request per entry to TypeSafe's Jev model: three Score questions rate the whole entry
(depression, anxiety, meaning) on a 5-level rubric, stretched to 0-100, plus a Noul per sentence and signal to find the
sentences that drove each score (the highlights). Set `JEV_API_KEY`; pin `JEV_MODEL` once you tune thresholds.
If Jev is unreachable the API answers 502 `scoring_unavailable` and saves nothing.

## Privacy choices
- Entry text is sent to TypeSafe for scoring. Check their retention policy before real use.
- Entry text, highlighted phrases and themes are AES-256-GCM encrypted per row (bound to user and date). Scores are
  plain so charts can be queried.
- Each user has their own data key (`user_keys`), stored wrapped by the master key (`ENTRY_ENCRYPTION_KEY`) and bound
  to their user id. New entries are sealed with it (`v2.` ciphertexts). One user's key opens only that user's entries,
  and deleting the account deletes the key, so a restored backup of their rows can never be read. Older entries are
  sealed with the master key (`v1.`) until `npm run db:reencrypt` moves them (see below). See `src/vault.ts`.
- The server still has to open entries to score and show them, so this limits the damage of a leaked key, a copied
  table or a bug. It does not hide entries from the server itself.
- Request bodies are never logged.
- Row-level security is on as a second layer (`drizzle/rls.sql`).

## Moving existing entries to per-user keys
Do these in order. Each step is safe to repeat.
1. `npm run db:migrate`. Adds the `user_keys` table. Old code ignores it, so this is safe to do first.
2. Deploy this version. It reads `v1` and `v2` entries, and writes `v2`.
3. `npm run db:reencrypt -- --dry-run`. Opens every old entry and writes nothing. `failed` should be 0.
4. `npm run db:reencrypt`. Re-seals old entries with their owners' keys. It can run while the app is serving
   traffic, can be stopped and restarted, and will not overwrite an entry that was edited while it ran.

Rolling back: once users have written `v2` entries, the previous version of the server cannot read them. Roll back
to a build that understands `v2`, not to one from before this change.

Backups: `user_keys` is part of the database, and the master key is not. Keep backing up `ENTRY_ENCRYPTION_KEY`
outside the database. Losing it loses every user key, and with them every entry.

## Not done yet
- Rate limiting, rotating the master key (the wrapped user keys are the only thing that would need re-wrapping, and
  their `v1` prefix leaves room for a new version), and hosting/deploy.
