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
3. `npm install`, then `npm run db:migrate` (creates `entries` and turns on row-level security).
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
- Entry text and highlighted phrases are AES-256-GCM encrypted per row (bound to user and date). Scores are plain so
  charts can be queried.
- Request bodies are never logged.
- Row-level security is on as a second layer (`drizzle/rls.sql`).

## Not done yet
- Rate limiting, key rotation (ciphertexts carry a `v1` prefix for it), and hosting/deploy.
