# כלב LOVE — Setup & QA Checklist (Plan 01)

The code for Slices 0–1 (foundation + auth) is complete. To actually run it end-to-end you need a live Supabase backend, Google OAuth credentials, and a phone. These are the steps only you can do.

## Prerequisites (one-time, on your PC)
- Node.js 18+ (you have v24) and npm.
- The **Expo Go** app installed on your phone (Android: Play Store).
- From `C:\Apps\DogLove`, run `npm install` once (pulls dependencies).

---

## 1. Create the Supabase project
1. Go to https://supabase.com → sign in → **New project**.
2. Name it `doglove`, pick a region near you, set a database password (save it).
3. Wait ~2 min for it to provision.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key.

## 2. Add your keys locally (never commit these)
1. In `C:\Apps\DogLove`, copy `.env.example` to `.env`.
2. Fill in:
   ```
   SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   SUPABASE_ANON_KEY=your-anon-public-key
   ```
   `.env` is git-ignored — it will not be committed.

## 3. Apply the database migration
1. Supabase dashboard → **SQL Editor** → New query.
2. Paste the entire contents of `supabase/migrations/0001_profiles.sql` and **Run**.
3. Expected: "Success. No rows returned."
4. **Table Editor** → confirm a `profiles` table exists with a shield icon (RLS on).

## 4. Enable auth providers
- **Email:** Authentication → Providers → Email — on by default. (For easy testing you may turn OFF "Confirm email" so you can log in immediately.)
- **Google:**
  1. In Google Cloud Console (https://console.cloud.google.com): create an OAuth 2.0 Client ID (type: Web application).
  2. Add the Supabase callback URL (shown in Supabase → Authentication → Providers → Google) as an **Authorized redirect URI**.
  3. Copy the Google **Client ID** and **Client secret** into Supabase → Providers → Google → enable.

## 5. Run the app on your phone
1. From `C:\Apps\DogLove`, run `npm start`.
2. On your phone, open **Expo Go** → scan the QR code in the terminal.
3. The app loads as **כלב LOVE**.

---

## QA test pass (what to verify)
- [ ] App launches; name renders right-to-left (כלב on the right, LOVE on the left).
- [ ] **First run:** the data-exposure privacy notice appears before anything else; accepting it goes to login.
- [ ] **Sign up (email):** enter a date of birth that makes you **under 18** → blocked with a Hebrew "must be 18+" message, no account created.
- [ ] **Sign up (email):** valid 18+ DOB + email + 6+ char password → account created (check Supabase → auth.users AND a matching row in `profiles`).
- [ ] **Bad password:** wrong password on login → clear error.
- [ ] **Google sign-in:** completes and lands on Home.
- [ ] **Home:** shows your email (or "מחובר עם Google").
- [ ] **Sign out:** returns to login.
- [ ] **Session persists:** kill and reopen the app → still signed in (until you sign out).

Report anything that breaks — that's the loop: you test, I fix.

---

## Known limitation (tracked for Plan 02)
The 18+ age gate is currently **client-side only**. Server-side enforcement and the `date_of_birth`/`age`/`gender` profile columns are scheduled for **Plan 02 (Profiles)**. See the carry-forward note in `docs/plans/2026-06-27-plan-01-foundation-and-auth.md`.

## What's next
Plan 01 = foundation + auth. The next plans build the rest of the MVP, each its own design → plan → build cycle:
- **Plan 02** — Profiles (owner + dog profiles, photos; adds DOB/age/gender + server-side age gate)
- **Plan 03** — Live map + radius + walk sessions
- **Plan 04** — Matchmaking / playdate requests
- **Plan 05** — Real-time chat
- **Plan 06** — Privacy center
