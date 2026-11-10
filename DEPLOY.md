# Deploying Lilac Pages

Three parts: **Supabase** (database + login, already live), **Render** (the API in `server/`), **Vercel** (the web app).
Do them in this order, because each needs the address of the one before.

## 0. Put the code on GitHub
Nothing is pushed anywhere yet. Create an empty **private** repo on GitHub, then from the project root:

```
git add -A
git status          # glance over it: no .env files should be listed
git commit -m "lilac"
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```
(`.env`, `server/.env` and `node_modules` are git-ignored. A scan found no keys in the files that will be committed.)

## 1. Render: the API
1. Render dashboard > **New > Blueprint** > choose the repo. It reads [render.yaml](render.yaml).
2. Fill in the values it asks for. Copy them from `server/.env`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | same as local (Supabase connection string) |
| `SUPABASE_URL` | same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | the `sb_secret_...` key |
| `ENTRY_ENCRYPTION_KEY` | **exactly** the same as local, or existing entries become unreadable |
| `JEV_API_KEY` | same as local |
| `CORS_ORIGINS` | leave blank for now; set it in step 3 |

3. Deploy. Open `https://<service>.onrender.com/health`. It should show `{"ok":true}`.
4. The database already has its tables. If you ever add a migration, run `npm run db:migrate` inside `server/`.

The Blueprint uses the paid `starter` plan so the API never sleeps. On `free` it sleeps when idle and the first
request after a break takes a long time.

## 2. Vercel: the web app
1. Vercel > **Add New > Project** > import the repo. Leave the root directory as the repo root.
   [vercel.json](vercel.json) sets the build (`npx expo export --platform web`), the output folder, and sends every
   path to `index.html` so links like `/entry/2026-10-19` work.
2. Add these **Environment Variables** (they are baked in at build time, so changing one means redeploying):

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | same as `SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_KEY` | the `sb_publishable_...` key (never the secret key) |
| `EXPO_PUBLIC_API_URL` | your Render address, e.g. `https://reflex-api.onrender.com` |

3. Deploy. Note the site address, e.g. `https://lilac.vercel.app`.

## 3. Connect them
- **Render:** set `CORS_ORIGINS` to the Vercel address (no trailing slash). Redeploy if it doesn't restart on its own.
  Without this the browser blocks every call to the API.
- **Supabase** > Authentication > URL Configuration: set **Site URL** to the Vercel address and add it under
  **Redirect URLs**. Otherwise email confirmation links point at the wrong place.
- **Supabase** > Authentication > Emails: the built-in sender is heavily rate-limited. For anyone but you, set up custom
  SMTP. For just you, you can switch off "Confirm email".

## 4. Use it on your phone
Open the Vercel address in Safari, then Share > **Add to Home Screen**. The native iOS app is built with EAS and
needs an Apple developer account: see "iOS app" below.

## 5. Keep the free tiers awake
Render's free tier sleeps after ~15 minutes idle, and a free Supabase project pauses after ~7 days without database
activity. Point an uptime monitor (e.g. UptimeRobot, 5-minute interval) at `https://<service>.onrender.com/health`.
`/health` runs `select 1`, so one ping keeps both awake, and returns 503 if the database is unreachable. Consider the
paid Render plan before App Review so a cold start can't time out a reviewer.

## iOS app (EAS)
1. Link the project once: `npx eas-cli@latest init`.
2. `.env` is git-ignored, so EAS builds don't see it. Create the three `EXPO_PUBLIC_*` variables above in EAS for the
   `production` environment: `eas env:create --environment production`.
3. `eas build -p ios --profile production`, then `eas submit -p ios` (uploads to TestFlight).
4. Store listing copy, privacy answers and review notes are in [docs/APP_STORE.md](docs/APP_STORE.md).

## Before relying on it
- Back up `ENTRY_ENCRYPTION_KEY` somewhere outside the database (a password manager). Losing it loses every entry.
- Free-tier Supabase projects pause after a period of inactivity, and a paused project stops working. Check the current
  policy and consider the paid plan, which also adds proper backups.
- Entry text is sent to TypeSafe for scoring. Review their data retention terms.
- Not built yet: rate limiting. (Settings with data export and account deletion, the consent and privacy screens, and
  the crisis-support screen for entries that mention self-harm are built.)
