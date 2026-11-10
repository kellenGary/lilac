# App Store listing: Lilac Pages

Draft copy and answers for App Store Connect. Character limits are Apple's.

## Metadata
- **Name** (30): `Lilac Pages`
- **Subtitle** (30): `A calm journal that reads back` (30)
- **Category**: Primary Health & Fitness, secondary Lifestyle. (Health & Fitness invites more scrutiny of the
  "not medical" wording; Lifestyle alone is the lower-risk choice if review pushes back.)
- **Keywords** (100): `journal,diary,mood,wellbeing,reflection,mindfulness,gratitude,check-in,private,writing`
- **Age rating**: answer the questionnaire honestly; expect 12+ (user-written content may mention mature themes,
  no UGC sharing). Not "Made for Kids".
- **Support URL**: needs a real page or email (see Open items)
- **Privacy policy URL**: `https://<your-vercel-site>/privacy`
- **Copyright**: `2026 Kellen Gary`

## Promotional text (170, editable without review)
Write a few lines a day. Lilac Pages reads them back as gentle scores and themes, so you can see how you've been without
having to name it first.

## Description
Lilac Pages is a quiet place to write about your day.

Write as much or as little as you like. Lilac Pages reads your entry and gives it back to you as a few gentle scores and the
themes that came up, with the phrases that drove each one highlighted so you can see why.

- Write a short entry each day and optionally check in on how you feel
- See the themes in your week: work, sleep, family, friends, money and more
- Watch patterns build over time in your garden
- Download everything you've written, or delete your account and every entry, from Settings
- Your entries are encrypted before they are stored, and there are no ads or trackers

Lilac Pages is a journal, not a medical service. Its scores are an estimate drawn from your words and are not a diagnosis or
medical advice. If you are in crisis, call or text 988 (US), or your local emergency number.

To score an entry, its text (never your name or email) is sent to a third-party AI service. You'll be asked to agree
to this before you start.

## What's New (1.0.0)
First release.

## TestFlight "What to test"
Create an account, write an entry, and look at the score, the highlights, and the Week and Patterns tabs. Try
Settings: download your data and delete the account. Tell me anything confusing or slow, especially the first
request after the app has been idle.

## App Review notes
```
Lilac Pages is a journaling app. Sign in with the demo account below (email confirmation is already done):

  Email:    <demo account email>
  Password: <demo account password>

Entry text is sent to a third-party AI service (TypeSafe) to produce scores; the user consents on first launch.
The scores are not medical advice (stated on the consent screen, Settings and the privacy policy). Entries that
contain crisis language show a screen with 988 and other support resources. Account deletion and data export are
in Settings.
```

## App Privacy questionnaire ("nutrition label")
Tracking: **No** (no ad identifiers, no data shared for advertising). Data is collected, linked to the user, used
only for App Functionality.

| Data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Contact Info: Email Address | Yes | Yes | No | App Functionality |
| Contact Info: Name | Yes | Yes | No | App Functionality |
| User Content: Other User Content (journal entries, check-ins) | Yes | Yes | No | App Functionality |
| Identifiers: User ID | Yes | Yes | No | App Functionality |
| Health & Fitness | Probably no: the scores are derived mood estimates, not health data from HealthKit; answer conservatively if unsure |  |  |  |

Not collected: location, contacts, browsing history, diagnostics, advertising data. The app has no analytics SDK, so
leave Usage Data and Diagnostics off. Revisit if you add crash reporting.

## Export compliance
Already set (`ITSAppUsesNonExemptEncryption: false`): the app only uses standard HTTPS.

## Screenshots
Required: iPhone 6.9" (1320 x 2868). Apple scales it for smaller phones. Suggested order: write, entry result with
highlights, week, patterns/garden, settings.

## Open items
- `CONTACT_EMAIL` in `src/lib/legal.ts` is empty. Add a real support address; the support URL and policy should have one.
- Create a demo account with a few seeded entries for the reviewer.
- Name "Lilac Pages" must be free in App Store Connect when you reserve it. The bundle ID stays `com.kellengary.lilac`.
