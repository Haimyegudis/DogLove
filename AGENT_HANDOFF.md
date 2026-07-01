# כלב LOVE (DogLove) — Agent Handoff & Project Overview

> Single source of truth for any AI agent or developer picking this up. Read this first.
> Last updated: 2026-07-01. Branch `feat/plan-01-foundation-auth`, latest commit `33df9cd`.
> Repo: https://github.com/Haimyegudis/DogLove · 43 SQL migrations · 35 test files (120 tests).

---

## 1. What this app is

A cross-platform (Android-first) **RTL Hebrew** social app for dogs and their owners. Three stated purposes (documented in `TECHNICAL_REQUIREMENTS.md`):

1. **Social app for dogs** — find playmates/friends, see active dogs on a live map, arrange playdates.
2. **Dating-style app** — singles with dogs meet each other *through* their dogs (owner discovery + swipe + mutual match).
3. **Community** — find friends, find/offer dog-walking, schedule group park meetups.

Brand wordmark: **כלב** (right) + **love** (left) with a paw badge. The owner/tester is a **QA engineer, non-developer** — the AI writes all code; the user tests on-device and reports bugs.

---

## 2. Tech stack & tools

| Layer | Tool |
|---|---|
| App framework | **React Native + Expo SDK 54**, TypeScript (strict) |
| Navigation | **expo-router** (file-based, `app/` dir) |
| Backend | **Supabase** — Postgres + **PostGIS**, Auth, Realtime, Storage |
| Maps | **MapLibre GL JS** in a WebView + **OpenFreeMap** tiles (free, no key). `MapWebView` (display) + `MapPicker` (tap-to-pin) |
| Geocoding | **Nominatim** (needs `User-Agent` header) — `geocode.ts` |
| Places (vets/parks/shops) | **Overpass API** (OpenStreetMap), called **server-side** from a Postgres RPC via the `http` extension, with a cache table |
| Push | **expo-notifications** + Expo Push API (sent from DB triggers via `pg_net`); Android needs **FCM V1** |
| Fonts | **Heebo** (body) + **Suez One** (Hebrew display serif) via `@expo-google-fonts/*` |
| Build/deploy | **EAS Build** (`eas.json`, profiles `development` + `preview`), APK distribution `internal` |
| Tests | **Jest** (`jest-expo`), service-layer unit tests with inline factory mocks |
| Source control | GitHub (`Haimyegudis/DogLove`) |

**Cost model:** Supabase free tier + EAS free tier. EAS free plan = **limited Android builds/month** (they reset on the 1st). When exhausted, `eas build` fails with a quota message — wait for reset or upgrade.

---

## 3. Key identifiers / accounts

- **Android package:** `com.doglove.app`
- **EAS:** account/owner `haimye`, project `doglove`, projectId in `.env` (`EAS_PROJECT_ID`).
- **Supabase project ref:** `jynyrowglsojakfwcufm` — URL `https://jynyrowglsojakfwcufm.supabase.co`
- **Firebase:** project `doglove-d9254`. `google-services.json` is committed (safe; ships in APK). The **FCM V1 service account** JSON is gitignored (`fcm-service-account.json`) and uploaded to EAS credentials separately.
- **Publishable/anon Supabase key** ships in the app (public by design) — in `.env` as `SUPABASE_ANON_KEY`.

### Secrets
- Local dev secrets live in **`.env`** (git-ignored): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `EAS_PROJECT_ID`. Loaded by `app.config.ts` (`dotenv/config`) into `expo.extra`.
- EAS builds read the same vars from **EAS Environment Variables** (environments `development` + `preview`).
- **DB password** (Postgres direct/pooler) is NOT stored in the repo — it's the user's Supabase database password. Ask the user; never commit it.

---

## 4. Architecture

**Three clean layers:**

```
app/ (expo-router screens)  ->  src/services/*.ts  ->  Supabase (RPC / table / storage / realtime)
        UI, RTL Hebrew          { data, error } contract      Postgres + RLS + SECURITY DEFINER RPCs
```

- **Service contract:** every function in `src/services/` returns `{ data, error: error?.message ?? null }` (or `{ error }`). Screens never call Supabase directly for cross-user reads.
- **RLS everywhere.** Every table has Row-Level Security. `profiles` is locked to own-row (`profiles_select_own`). Cross-user reads go through **SECURITY DEFINER RPCs** that (a) pin `set search_path = public`, (b) return only safe columns, (c) enforce `is_discoverable` + `is_blocked_with(...)`. EXECUTE is revoked from `public`/`anon` and granted to `authenticated`.
- **Realtime privacy:** precise `walk_sessions.location` is NOT published. A trigger mirrors coarse (~110m) coords into `active_walk_pings`, and only that table is in the `supabase_realtime` publication. Clients subscribe to it as a "something changed" trigger, then refetch via the coarsening RPC. (Note: policies used in Realtime must be evaluable without reading other users' `profiles` — use SECURITY DEFINER helpers like `dog_owner_discoverable` / `owner_discoverable`.)
- **State:** `src/state/AuthContext.tsx` holds the Supabase session; `app/(app)/_layout.tsx` guards the signed-in group + first-run onboarding redirect + a global new-message toast listener.
- **Design tokens:** `src/theme.ts` — ALL colors/fonts/spacing/shadow. Changing it reskins the whole app. Current theme = **"Golden-Hour Dog Park"** (warm bone paper, sunset coral + raspberry + leaf green + honey, deep espresso ink; Suez One display + Heebo body; tactile offset shadows).

---

## 5. Features → where they live

| Feature | Screen(s) | Service | Migration(s) |
|---|---|---|---|
| Auth (email + Google PKCE) | `(auth)/login`,`signup`, `auth-callback` | `auth.ts` | 0001 |
| Owner + dog profiles, photo | `edit-profile`, `dog/[id]`, `(tabs)/profile` | `profile`,`dogs`,`storage` | 0001,0002,0020 |
| Live map + nearby active dogs | `(tabs)/map` | `walk`,`location`,`walkRealtime` | 0003,0004,0016,0026,0038 |
| Start/stop walk + coarse realtime pings | `(tabs)/map` | `walk`,`walkRealtime` | 0027,0038 |
| Matchmaking / playdate requests | `browse`,`request/[dogId]`,`(tabs)/playdates` | `match`,`playdates` | 0006,0007 |
| Chat + in-chat propose-meetup + block | `chat/[id]`,`(tabs)/messages` | `chat`,`safety` | 0008 |
| Scheduled playdates / calendar | `calendar` | `playdates` | 0011,0012 |
| Search dogs + owners (filters: age/intent) | `search` | `search` | 0009,0014,0030,0042,0043 |
| Owner profile (dating discovery target) | `owner-view/[userId]` | `owners` | 0039 |
| Dating swipe + mutual match | `discover-people` | `dating` | 0040 |
| Read-only dog card (after accept) | `dog-view/[dogId]` | `dogs`(getDogCard) | 0035 |
| Social photo feed + reactions + distance sort | `feed`,`new-post` | `feed` | 0017,0033,0035 |
| Photo galleries (owner + dog, multi-upload) | `profile`,`dog/[id]` | `gallery` | 0034 |
| Lost-dog alerts + map pin + bounded push | `lost-dogs`,`report-lost` | `lost` | 0019,0036,0042 |
| Group/social walks (events) | `social-walks`,`new-social-walk` | `events` | 0019 |
| Park check-in ("I'm here now") | `park-checkins` | `checkins` | 0041 |
| Dog-walker search (location+distance) | `walkers`,`active-walkers` | `walkers`,`walk` | 0020,0028,0029 |
| Walk stats/streaks | `walk-stats` | `stats` | 0019 |
| Dog health records | `dog-health/[dogId]` | `health` | 0019 |
| User ratings (1–5★) | in `chat` | `ratings` | 0019 |
| Fitness challenges | `challenges` | `challenges` | 0021 |
| Badges/achievements | `badges` | `badges` | 0022 |
| Dog compatibility score | `CompatibilityBadge` in request/dog-view | `compatibility` | 0023 |
| Verified-owner badge | `VerifiedBadge` | `verification` | 0024 |
| Premium tier (mock, no billing) + other-area map | `premium`,`map` | `premium` | 0025 |
| Vet/park/pet-shop directory + reviews/ratings | `places`,`place/[id]` | `places` | 0031,0032,0042 |
| Block / report | request/owner-view/dog-view/chat | `safety` | 0018 |
| Privacy toggles + account deletion + walker toggle | `privacy` | `privacy`,`walkers` | 0013 |
| Onboarding (first run) | `onboarding` | `useOnboarding` hook | — |
| Intent tags (friends/dates/walks) | `edit-profile` | `owners` | 0039 |
| Push notifications | infra | `push` | 0015,0033 |
| i18n (he/en, partial) | `src/i18n/` | — | — |

---

## 6. Database (high level)

Tables (public): `profiles`, `dogs`, `walk_sessions`, `active_walk_pings`, `playdate_requests`, `conversations`, `messages`, `scheduled_playdates`, `blocks`, `reports`, `dog_posts`, `post_reactions`, `gallery_photos`, `lost_dogs`, `walk_log`, `dog_health`, `user_ratings`, `events`, `event_attendees`, `challenges`, `challenge_participants`, `place_reviews`, `osm_cache`, `owner_likes`, `park_checkins`. Plus `extensions.http`, PostGIS, `pg_net`.

Notable RPCs (SECURITY DEFINER unless noted): `nearby_active_dogs`, `list_active_walkers`, `available_walkers`, `nearby_walkers`, `browse_dogs`, `search_dogs`, `search_users`, `get_owner_card`, `list_owner_dogs`, `get_dog_card`, `set_intent`, `discover_owners`, `swipe_owner`, `check_in_park`, `nearby_checkins`, `list_feed`, `set_home_location`, `nearby_places` (Overpass + cache), `place_ratings`/`rate_place`/`list_place_reviews`, `report_lost_dog`, `nearby_lost_dogs`, `my_walk_stats`, `my_badges`, `dog_compatibility`, `is_verified_owner`, `am_i_premium`/`set_premium`, `get_or_create_conversation` (block-aware), helpers `is_blocked_with`, `owner_discoverable`, `dog_owner_discoverable`.

Triggers: `trg_notify_new_message`, `trg_notify_new_request`, `trg_notify_new_reaction` (push via pg_net), `trg_sync_walk_ping` (coarse realtime), `trg_enforce_adult_profile`, `trg_lock_playdate_parties`.

---

## 7. How to run / build / deploy

### Apply a migration (no Supabase CLI — use the pooler)
Migrations are applied with a small Node `pg` script against the **pooler** (direct `db.<ref>.supabase.co` is ENOTFOUND from here):
- Host `aws-1-ap-southeast-1.pooler.supabase.com`, port `5432`, user `postgres.jynyrowglsojakfwcufm`, database `postgres`, `ssl: { rejectUnauthorized: false }`, password = the user's Supabase DB password.
- Pattern: `client.query('begin'); client.query(sqlFileContents); client.query('commit')`.
- **Gotcha:** `pg` is installed with `--no-save`, so `npm install`/`expo install` **prunes it**. Re-run `npm i pg --no-save` before pooler scripts if it's missing.
- Common SQL gotcha: `round(double precision, int)` doesn't exist — cast `round((x)::numeric, n)`.

### Dev on device
`npx expo start --dev-client --tunnel --port 8081` (tunnel works off-LAN). Generate a QR for the tunnel URL with `npx qrcode "exp://<host>.exp.direct" -o qr.png`. Expo Go dropped remote push in SDK 53+, so use a dev/preview build for anything push-related.

### Build an installable APK
`set -a && . ./.env && set +a && npx eas-cli build --profile preview --platform android --non-interactive --no-wait` → prints a build URL → poll `eas build:view <id>` → the **Application Archive URL** is the `.apk`. Generate a QR and send to the user. **Do NOT pipe the submit through `grep`** — it hides errors (e.g. the free-quota message).

### Push (FCM) end-to-end
1. `google-services.json` (committed, `android.googleServicesFile` in `app.config.ts`) → app registers an Expo push token on open (`push.ts` `registerForPush`, called from `AuthContext`).
2. FCM V1 **service account** uploaded to EAS (Expo dashboard → Credentials → Android → FCM V1, or `eas credentials`, interactive only).
3. DB triggers send to Expo Push API; Expo forwards to Android via FCM.
Verify a token registered: `select count(*) filter (where push_token is not null) from profiles;`.

---

## 8. Design system

`src/theme.ts` is the whole design. Token names are stable (legacy "warm" + "cool" sets both map into one palette) so re-skinning = editing one file.
- Palette: `cream #FBF5EA` bg, `coral #FF6A3D`, `rose #FF5D73` (love/dating), `green #2F7A52`, `gold/purple #E8992B`, ink `#2E211A`.
- Fonts: `font.display = SuezOne_400Regular` (brand/hero/section/headers), body = Heebo (`regular/medium/bold/black`). Loaded in `app/_layout.tsx`.
- `shadow.card`/`shadow.soft` = warm tactile offset. `gradients.hero` = golden-hour.
- RTL: `I18nManager.forceRTL(true)` at root; screens use `flexDirection: 'row-reverse'`, `textAlign: 'right'`, `writingDirection: 'rtl'`.

---

## 9. Known gotchas / conventions

- **RTL Hebrew everywhere.** New UI must be RTL. Map labels need the MapLibre RTL text plugin (already in `MapWebView`).
- **Realtime + RLS:** postgres_changes evaluates the SELECT policy as the subscriber. If the policy reads other users' `profiles`, it fails (profiles_select_own) and events are dropped. Use SECURITY DEFINER helper predicates.
- **`pg` gets pruned** by npm/expo installs (see §7).
- **EAS free build quota** resets on the 1st; exhausted = build fails with a quota message (not a code error).
- **Storage** buckets `avatars`, `dog-photos` are public; upload paths use a random suffix so URLs aren't enumerable. (Full private-bucket + signed-URL migration is deferred — see §10.)
- Tests: run `npx tsc --noEmit` and `npm test` before every commit. Keep them green.
- Commit trailers include `Co-Authored-By: Claude ...` + `Claude-Session:` (see git log).

---

## 10. Deferred / not-yet-done (backlog)

- **Private photo buckets + signed URLs** (currently public buckets w/ unguessable names — larger migration).
- **Finish or drop English i18n** (only ~4 screens use `t()`; dictionary in `src/i18n/strings.ts`).
- **TanStack Query** over the service layer (screens hand-roll `useState/useEffect/loading`; tabs poll `listIncoming` every 30s).
- **Deeper tests** — current suite is mostly mock-passthrough; add pgTAP/RLS/integration tests.
- Split `map.tsx` (god component) into a `useWalkSession` hook.
- Verify push works after both phones open the FCM build once.
- Original spec still lists (not built): premium real billing, English full, vet directory beyond OSM.

---

## 11. Where to look first

- Spec & purposes: `TECHNICAL_REQUIREMENTS.md`
- Plans: `docs/plans/`
- Design tokens: `src/theme.ts`
- Nav + guards + toast + onboarding redirect: `app/(app)/_layout.tsx`
- Dashboard (feature entry points): `app/(app)/(tabs)/index.tsx`
- Every DB change: `supabase/migrations/` (sequential `NNNN_name.sql`)
- Service contracts: `src/services/`
