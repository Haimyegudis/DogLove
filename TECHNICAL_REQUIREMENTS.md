# כלב LOVE — Technical Requirements Document

> **Tinder meets Waze for dogs and their owners** — a live map of dogs out walking right now, plus playdate matchmaking and chat.

**App name:** **כלב LOVE** — Hebrew word **כלב** ("dog") rendered on the **right**, the word **LOVE** on the **left** (natural right-to-left composition). Working/internal project name: *DogLove*.

**Version:** 1.2
**Date:** 2026-06-27
**Status:** Approved design — ready for implementation planning
**Author:** Product owner (QA) + Claude Code

### Change log
- **1.2** — Added 18+ age gate at sign-up; expanded owner profile with photo, age, and gender; clarified required vs optional dog-profile fields (name, type, age, photo required; description optional); added a **playdate calendar** (scheduled playdates with date/time, location, and the dog + owner you're meeting); added **search** — dogs by type and users by location, age, and gender; reaffirmed data-privacy guarantees for the new fields.
- **1.1** — Added Google sign-in; full feature catalog (all features, incl. future); expanded security & privacy with data-exposure transparency/notifications; UI/UX & branding section (RTL Hebrew name, gesture-first, performance); reference to attached mockup as visual source-of-truth.
- **1.0** — Initial approved MVP design.

---

## 1. Overview

DogLove is a cross-platform mobile social network for dogs and their owners. Owners create profiles for themselves and their dogs, see other active dogs near them on a live map, set up playdates, and chat with each other in real time.

This document covers the **MVP** only. Later features (fitness challenges, photo feed, walk scheduling, habit tracking) are out of scope for v1 and listed in Section 11.

### 1.0 Product description — "Tinder meets Waze for dogs"

DogLove combines two familiar ideas into one app for dog owners:

- **The "Waze" half — a live map of dogs out right now.** When you take your dog for a walk, you tap **Start Walk** and your dog appears on a shared map. You see other dogs currently out walking around you, choose how far to look (1/3/5 km), and see a live count of how many dogs are active nearby. When you finish, you tap **End Walk** and disappear from the map. Nobody is tracked when they're not walking — location is shared only during an active walk. This turns a lonely dog walk into a way to discover who else is out, right now, near you.

- **The "Tinder" half — matchmaking for dogs.** Each dog has a profile (name, breed, age, size, photo, bio). You browse nearby dogs and, when you find a good potential playmate, you send a **playdate request**. If the other owner accepts, the two of you are connected and a chat opens so you can arrange to meet. It's "swipe to find a friend for your dog," grounded in who is actually near you.

- **The glue — real-time chat.** Once two owners match on a playdate, they message each other in real time to coordinate where and when to meet up.

**The everyday story:** Maya takes Rocky out for an evening walk and taps Start Walk. She opens the map and sees three other dogs active within 1 km. One is Bella, a same-sized, similar-age dog two streets over. Maya opens Bella's profile and sends a playdate request. Bella's owner gets a notification, accepts, and they chat to meet at the corner park in ten minutes. Both dogs get a friend; both owners get a walking buddy.

In one line: **DogLove is Tinder's matchmaking and Waze's live map, built for dogs and the people who walk them.**

### 1.1 MVP feature set

1. **Authentication** — sign in with **Google account** *or* create a new account with **email + password**; log in / log out. **Users must be at least 18 years old.**
2. **Profiles** — one owner profile (name, photo, age, gender, bio) and one or more dog profiles (name, type, age, photo required; description optional), with photos.
3. **Live map + radius** — see active dogs nearby, choose a search radius, see how many dogs are active around you. Location is shared **only** while the user is "out on a walk."
4. **Matchmaking** — browse nearby dogs and send a playdate request.
5. **Chat** — real-time messaging between owners after a playdate is accepted.
6. **Search** — find dogs by **type**, and find users by **location, age, and gender**.
7. **Playdate calendar** — see scheduled playdates: date/time, location, and which dog + owner you're meeting.

### 1.2 Out of scope for MVP

The features below are **part of the product vision** and documented in full in Section 1.3, but are **not built in the first release**. MVP = the five items in 1.1.

Out of MVP (built in later phases): fitness challenges, photo feed / social wall, scheduled walks, dog habit tracking, iPhone release, group walks/events, ratings & reviews, lost-dog alerts, vet/service directory, payments/premium.

### 1.3 Full feature catalog (everything the app will do, now and later)

This is the complete vision. The **Phase** column says when each feature is built. Nothing here is dropped — only sequenced.

| # | Feature | What it does | Phase |
|---|---|---|---|
| F1 | **Sign in with Google** | One-tap login with a Google account | **MVP** |
| F2 | **Email/password account** | Create account, log in, log out, reset password | **MVP** |
| F3 | **Owner profile** | Name, photo, **age, gender**, bio | **MVP** |
| F4 | **Dog profile(s)** | One or more dogs: name, **type/breed, age, photo (required)**, size, description/bio (optional) | **MVP** |
| F5 | **Live walk map** | Tap Start Walk → dog appears on a shared map for others nearby | **MVP** |
| F6 | **Radius selector** | Choose 1/3/5 km search range | **MVP** |
| F7 | **Active-dogs-nearby count** | Live count of dogs currently walking within the radius | **MVP** |
| F8 | **Location sharing control** | Location shared only during an active walk; End Walk removes it | **MVP** |
| F9 | **Data-exposure notice** | Clear in-app notice of exactly what each action shares, before sharing | **MVP** |
| F10 | **Matchmaking / playdate requests** | Browse nearby dogs, send a playdate request, accept/decline | **MVP** |
| F11 | **Real-time chat** | Message the other owner once a playdate is accepted | **MVP** |
| F12 | **Push notifications** | New message, playdate request, request accepted | **MVP** |
| F13 | **Privacy & consent center** | View/manage permissions, what's shared, delete account & data | **MVP (core) → expanded later** |
| F25 | **18+ age gate** | Sign-up blocked for users under 18; age confirmed at registration | **MVP** |
| F26 | **Search dogs by type** | Filter/find dogs by breed/type | **MVP** |
| F27 | **Search users** | Find users by location, age, and gender | **MVP** |
| F28 | **Playdate calendar** | Calendar of scheduled playdates: date/time, location, the dog + owner you're meeting | **MVP** |
| F14 | **Photo feed / social wall** | Post dog photos; nearby/followed owners see a feed | Phase 2 |
| F15 | **Fitness challenges** | Step/distance goals, badges, leaderboards | Phase 2 |
| F16 | **Scheduled walks** | Set a planned walk time; notify nearby owners; coordinate group walks | Phase 2 |
| F17 | **Dog habit tracking** | Log and follow recurring behaviors (meals, walks, mood, health notes) | Phase 2 |
| F18 | **Group walks & events** | Create/join local dog meetups | Phase 3 |
| F19 | **Ratings & reviews** | Rate owners/playdates to build trust | Phase 3 |
| F20 | **Lost-dog alerts** | Broadcast a lost-dog alert to nearby users | Phase 3 |
| F21 | **Vet / service directory** | Nearby vets, groomers, parks, dog-friendly places | Phase 3 |
| F22 | **iPhone release** | Same codebase built for iOS | Phase 3 |
| F23 | **Premium / payments** | Optional paid tier (extended radius, advanced filters, etc.) | Phase 4 |
| F24 | **Moderation & reporting** | Report/block users, content moderation, safety tooling | Phase 2 (basic) → Phase 3 (full) |

Each non-MVP feature gets its own design → spec → plan → build cycle when its phase begins.

---

## 2. Goals and non-goals

### Goals
- Launch a working MVP that ~200 initial users can use end to end.
- Keep monthly running cost effectively $0 at MVP scale.
- Build in testable slices so the QA owner can verify each feature on a real phone.
- Privacy-first: no silent background tracking.

### Non-goals
- High-scale infrastructure (100k+ users) — handled later, not now.
- Native per-platform code — cross-platform only.
- Self-managed servers — use managed services exclusively.

---

## 3. Architecture

Two systems only. The product owner does **not** run a custom server; Supabase is the managed backend.

```
   ┌─────────────────────────────┐
   │        Phone App            │   React Native + Expo
   │  (owner installs / Expo Go) │   screens, map, chat UI, GPS
   └──────────────┬──────────────┘
                  │  HTTPS + WebSocket
                  ▼
   ┌─────────────────────────────┐
   │          Supabase           │   managed backend ("the server")
   │  - Auth        (logins)     │
   │  - Postgres + PostGIS (data + geo radius queries)
   │  - Realtime    (live chat + live map positions)
   │  - Storage     (dog / owner photos)
   │  - Row-Level Security (per-user data isolation)
   └─────────────────────────────┘
                  +
            ┌───────────┐
            │  Mapbox   │   renders the map tiles
            └───────────┘
                  +
        ┌───────────────────┐
        │ Expo Push (FCM)   │   push notifications
        └───────────────────┘
```

### 3.1 Technology stack

| Layer | Technology | Rationale |
|---|---|---|
| Mobile app | **React Native + Expo (managed workflow)** | One codebase → Android now, iPhone later. Expo Go lets the QA owner test instantly on a phone via QR code — no native build toolchain. |
| Backend / DB / Auth / Realtime / Storage | **Supabase** | Single managed service covering accounts (incl. **Google OAuth** + email/password), Postgres database, real-time subscriptions, file storage. PostGIS gives built-in geographic radius queries. Generous free tier. |
| UI / RTL / gestures | **React Native** + gesture & animation libraries; RTL layout | Hebrew-first **כלב LOVE** branding, smooth gesture-driven UX, 60 fps target |
| Geo queries | **PostGIS** (Supabase extension) | "Active dogs within X km" is a native spatial query, not custom math. |
| Map rendering | **Mapbox** (`@rnmapbox/maps`) | Cost-effective vs raw Google Maps; strong React Native support. |
| Photo storage | **Supabase Storage** | Object storage included; tables hold only the `photo_url`. |
| Push notifications | **Expo Push Notifications** (Android via FCM) | Free; integrates with the Expo workflow. |
| State / data layer | **Supabase JS client** + lightweight state (React Context or Zustand) | Minimal moving parts. |

### 3.2 Why no custom backend server

All server responsibilities (auth, data, real-time, storage, authorization) are provided by Supabase as managed features. The app talks directly to Supabase over HTTPS/WebSocket. This removes an entire system to build, host, secure, and maintain. Custom server logic, if ever needed, would be added later as Supabase Edge Functions.

---

## 4. Data model

PostgreSQL schema. All tables protected by Row-Level Security (Section 7).

### 4.1 `profiles` — the owner
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | equals `auth.users.id` |
| display_name | text | required |
| photo_url | text | required; points to Supabase Storage |
| date_of_birth | date | required; used to enforce 18+ gate at sign-up |
| age | int | derived from `date_of_birth` (years); used in user search |
| gender | text | required; enum-like `male` / `female` / `other` / `prefer_not_to_say` |
| home_location | geography(Point, 4326) | nullable; coarse/approx location used for "search users by location" (not live walk position) |
| bio | text | nullable |
| push_token | text | nullable; Expo push token for notifications |
| is_discoverable | boolean | default true; user can hide from matchmaking/search via Privacy center |
| auth_provider | text | `google` or `email` (informational) |
| created_at | timestamptz | default now() |

> **18+ enforcement:** `date_of_birth` is required at registration; the app rejects sign-up if the computed age is under 18 (F25). Server-side validation backs the client check.

### 4.2 `dogs`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| owner_id | uuid (FK → profiles.id) | required |
| name | text | required |
| breed | text | **required** — the dog's **type/breed**; indexed for "search dogs by type" |
| age | int | **required** (years) |
| size | text | enum-like: `S` / `M` / `L` |
| photo_url | text | **required**; points to Supabase Storage |
| description | text | nullable (optional free-text description / bio) |
| created_at | timestamptz | default now() |

> **Required dog fields:** name, type (breed), age, and photo are required; description is optional (F4).

### 4.3 `walk_sessions` — drives the live map
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| dog_id | uuid (FK → dogs.id) | required |
| is_active | boolean | default false |
| location | geography(Point, 4326) | PostGIS point (lat/lng) |
| updated_at | timestamptz | refreshed every ~20s while active |

Only rows with `is_active = true` are visible on the map. Ending a walk sets `is_active = false` and removes the pin everywhere.

### 4.4 `playdate_requests` — matchmaking
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| from_dog_id | uuid (FK → dogs.id) | |
| to_dog_id | uuid (FK → dogs.id) | |
| status | text | `pending` / `accepted` / `declined` |
| created_at | timestamptz | default now() |

### 4.5 `conversations`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| owner_a_id | uuid (FK → profiles.id) | |
| owner_b_id | uuid (FK → profiles.id) | |
| created_at | timestamptz | default now() |

Created automatically when a playdate request is accepted. Unique on the unordered pair (owner_a, owner_b) to prevent duplicates.

### 4.6 `messages`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| conversation_id | uuid (FK → conversations.id) | |
| sender_id | uuid (FK → profiles.id) | |
| body | text | required |
| created_at | timestamptz | default now() |

### 4.7 `scheduled_playdates` — the calendar
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| conversation_id | uuid (FK → conversations.id) | the accepted-playdate chat this was arranged in; nullable if scheduled directly |
| organizer_id | uuid (FK → profiles.id) | owner who created the entry |
| guest_id | uuid (FK → profiles.id) | the other owner being met |
| organizer_dog_id | uuid (FK → dogs.id) | dog the organizer brings |
| guest_dog_id | uuid (FK → dogs.id) | dog the guest brings |
| scheduled_at | timestamptz | required; date + time of the playdate |
| location_name | text | human-readable place (e.g. "Corner Park") |
| location | geography(Point, 4326) | nullable; meeting point for map display |
| status | text | `scheduled` / `cancelled` / `completed` |
| created_at | timestamptz | default now() |

Each owner's **calendar** is the set of `scheduled_playdates` where they are `organizer_id` or `guest_id`. The calendar view shows, per entry: date/time, location, and the dog + owner they're meeting (F28). Both participants see the same entry.

### 4.8 Photos

Dog and owner images are stored in **Supabase Storage** buckets (e.g. `avatars`, `dog-photos`). Database tables store only the resulting `photo_url`. No images are stored in the database itself.

---

## 5. Functional requirements & flows

### 5.1 Authentication
- FR-1.1 User can **sign in with a Google account** (Supabase Google OAuth provider).
- FR-1.2 User can create a new account with **email + password**.
- FR-1.3 User can log in and log out; email users can reset their password.
- FR-1.4 Invalid credentials show a clear error.
- FR-1.5 A new auth user (Google or email) automatically gets a `profiles` row (via trigger or first-login bootstrap).
- FR-1.6 On first sign-in the user sees the **data-exposure notice** (FR-6.x) before any data is shared.
- FR-1.7 **Age gate:** registration requires the user's date of birth; users **under 18 are blocked** from creating an account. Validated client-side and server-side; the under-18 case shows a clear message and no profile is created.

### 5.2 Profiles
- FR-2.1 User can create/edit their owner profile with **name, photo, age (date of birth), gender**, and an optional bio. Photo, age, and gender are required.
- FR-2.2 User can add one or more dogs. Required: **name, type (breed), age, photo**. Optional: **description**, size.
- FR-2.3 User can upload and replace photos for owner and dogs.
- FR-2.4 Basic validation (required fields enforced, age numeric, gender from allowed set, image size limit).

### 5.3 Live map + radius — Flow A & B
**Start a walk → appear on map:**
1. User taps **Start Walk** → selects which dog → `walk_sessions.is_active = true`.
2. App reads GPS and updates `location` every ~20 seconds.
3. Nearby users' maps receive the new position live via Supabase Realtime.
4. User taps **End Walk** → `is_active = false` → pin disappears for everyone.

**Dogs near me + radius:**
1. User picks a radius (1 / 3 / 5 km).
2. App queries Supabase (PostGIS): active dogs within X km of the user's location.
3. App receives the count + pin positions and renders them on Mapbox.
4. List/count refreshes as people start and end walks.

Requirements:
- FR-3.1 Location permission requested with clear explanation; denied → map still works without sharing self.
- FR-3.2 Location only transmitted while a walk is active.
- FR-3.3 Radius selector with at least 1/3/5 km options.
- FR-3.4 Live "active dogs nearby" count.
- FR-3.5 Update interval ~20s (configurable) to balance freshness, battery, and cost.

### 5.4 Matchmaking — Flow C
1. User taps a nearby dog's pin or card → views the dog profile.
2. User taps **Request Playdate** → row created in `playdate_requests` (status `pending`).
3. Target owner receives a push notification.
4. Target owner accepts → a `conversation` is created → chat enabled. Declines → request closed.

Requirements:
- FR-4.1 Browse nearby dogs (from map or list).
- FR-4.2 Send a playdate request.
- FR-4.3 Receive/accept/decline requests.
- FR-4.4 Accepting creates exactly one conversation.

### 5.5 Chat — Flow D
1. User opens a conversation → past `messages` load.
2. User sends a message → new `messages` row.
3. Recipient's screen updates instantly via Supabase Realtime.
4. If recipient is offline → push notification.

Requirements:
- FR-5.1 Real-time send/receive.
- FR-5.2 Message history persists and loads in order.
- FR-5.3 Push notification on new message when app is backgrounded/closed.
- FR-5.4 Chat only available between owners with an accepted playdate (an existing conversation).

### 5.6 Privacy, consent & data-exposure transparency
The app must make it obvious, in plain language, **what data is being shared and with whom**, and let the user control it.

- FR-6.1 On first sign-in, show a **data-exposure notice**: what the app collects (account, dog profile, location while walking) and who can see it.
- FR-6.2 Before the **first** Start Walk, show a clear notice: *"While your walk is active, nearby users can see your dog's live location and profile. It stops the moment you end the walk."* User must confirm.
- FR-6.3 A persistent, visible indicator whenever location is being shared (e.g. an "On a walk — sharing location" banner).
- FR-6.4 A **Privacy & consent center** screen where the user can see, at any time: what is currently shared, who can see their profile, and toggle shareable fields.
- FR-6.5 User can **delete their account and all associated data** from within the app.
- FR-6.6 Location history is not retained beyond the active walk session in MVP.
- FR-6.7 Each permission request (location, notifications, photos) is preceded by an in-app explanation of why it's needed and what it exposes.
- FR-6.8 Notifications/alerts inform the user of meaningful exposure changes (e.g. "You are now visible on the map").

### 5.7 Search — Flow E
**Search dogs by type:**
1. User opens search → enters/selects a dog **type (breed)**.
2. App queries `dogs` filtered by `breed`, scoped to discoverable owners.
3. Results list dog cards; tapping one opens the profile (and Request Playdate where applicable).

**Search users by location, age, gender:**
1. User opens user search → sets any of: **location** (area/radius from `home_location`), **age** range, **gender**.
2. App queries `profiles` (respecting `is_discoverable` and RLS) matching the filters.
3. Results list user cards.

Requirements:
- FR-7.1 Search dogs by type (breed), case-insensitive partial match.
- FR-7.2 Search users by any combination of location, age range, and gender.
- FR-7.3 Search respects privacy: only `is_discoverable` users/dogs appear; a user can exclude themselves from search via the Privacy center.
- FR-7.4 Location-based user search uses coarse `home_location`, **not** live walk position; live location is never exposed through search.

### 5.8 Playdate calendar — Flow F
1. After a playdate is accepted (and arranged in chat), either owner creates a **scheduled playdate**: date/time, location, the dog they bring, and the dog/owner they're meeting → row in `scheduled_playdates`.
2. The entry appears on **both** owners' calendars.
3. The calendar screen lists upcoming (and past) playdates; each entry shows date/time, location, and the dog + owner being met.
4. Either participant can cancel an entry (`status = cancelled`); both are notified.

Requirements:
- FR-8.1 User can schedule a playdate with date/time and location, linked to a dog and the other owner.
- FR-8.2 The scheduled playdate is visible on both participants' calendars with date/time, location, and the dog + owner being met.
- FR-8.3 Calendar lists upcoming playdates (and shows past/completed ones).
- FR-8.4 Either participant can cancel; the other is notified (push, per F12).
- FR-8.5 Calendar entries are private to the two participants (RLS, Section 7).

---

## 6. Non-functional requirements

- NFR-1 **Privacy:** exact location shared only during an active walk; ending a walk removes all shared location immediately.
- NFR-2 **Battery:** location updates throttled (~20s) and stop when no walk is active.
- NFR-3 **Cost:** stay within free tiers at ~200 users (target ~$0–5/month, see Section 9).
- NFR-4 **Security:** Row-Level Security enforced on all tables from day one.
- NFR-5 **Cross-platform:** single codebase, Android first; iPhone buildable later without rewrite.
- NFR-6 **Testability:** each build slice runnable on a physical phone via Expo Go.
- NFR-7 **Performance:** radius query and map render responsive at MVP scale (PostGIS spatial index on `walk_sessions.location`).

---

## 7. Security & privacy

- Supabase **Row-Level Security (RLS)** enabled on every table. Representative policies:
  - A user can read/update only their own `profiles` row.
  - A user can create/update/delete only `dogs` they own.
  - A user can read/write only `walk_sessions` for dogs they own; all users can *read* active sessions for map display (location only, no private data).
  - A user can read `messages` only in conversations they belong to.
  - A user can read `playdate_requests` only where they are sender or recipient.
  - A user can read/write a `scheduled_playdates` row only where they are `organizer_id` or `guest_id`; calendar entries are private to the two participants.
- **Search privacy:** search returns only profiles/dogs whose owner has `is_discoverable = true`; user search matches on `age`, `gender`, and coarse `home_location` only — never live walk location. Date of birth itself is never exposed to other users (only derived age, and only within the user's chosen discoverability).
- Location data minimized: only lat/lng of an active walk is readable by others; no history retained beyond the active session in MVP.
- Auth handled entirely by Supabase Auth (hashed passwords, session tokens managed by the platform).
- Secrets (Supabase keys, Mapbox token) stored in Expo environment config, not committed to source control. Only the public anon key ships in the app; RLS is the real protection layer.
- **Google sign-in** handled via Supabase's Google OAuth provider; the app never sees the user's Google password.
- **In transit:** all traffic over HTTPS/TLS (Supabase default). **At rest:** managed encryption by Supabase.

### 7.1 Privacy principles (must-follow rules)
1. **Transparency** — the user always knows what is being shared and with whom (see FR-6.x). No hidden data collection.
2. **Consent before exposure** — location/notification/photo permissions are explained in-app before the OS prompt; sharing on the map requires an explicit Start Walk.
3. **Data minimization** — collect only what the feature needs; share only an active walk's location, never historical tracks (MVP).
4. **User control** — the user can stop sharing instantly (End Walk), manage what's visible (Privacy center), and delete their account and data.
5. **Visible status** — a persistent indicator shows whenever location is being shared.
6. **Safety** — basic report/block tooling planned (F24) so users can flag bad actors.

### 7.2 Compliance posture
Design follows mainstream privacy regulation principles (GDPR-style: lawful basis, consent, right to access, right to deletion, data minimization). A user-facing **Privacy Policy** and **Terms of Service** are required before public launch. This is a design posture, not legal advice — review with a professional before release.

---

## 7.5 UI/UX, branding & interaction design

### Visual source-of-truth
The attached reference mockup is the **visual source-of-truth** for layout, colors, and screen flow:
`https://dogwalkers-map.preview.emergentagent.com/`

> Note: the mockup is a JavaScript app and could not be auto-captured into this document. To lock exact visual fidelity (colors, spacing, components), provide **screenshots** of each screen; the implementation will match them. Until then the UI follows the mockup's intent plus the principles below.

### Branding — app name
- Name: **כלב LOVE**, displayed with the Hebrew word **כלב** on the **right** and **LOVE** on the **left** (right-to-left composition: כלב ❤ LOVE).
- The name, logo lockup, and a heart motif appear on the splash/launch screen and login screen.
- App supports **Hebrew (RTL)** as a first-class layout direction. All screens must render correctly right-to-left; English text (e.g. "LOVE") sits inline within the RTL layout. (Full multi-language is Phase 2; correct RTL rendering is required from MVP because of the name and Hebrew UI.)

### Core UX principles
- **Map-first.** The live map is the home screen — the heart of the "Waze for dogs" experience.
- **Intuitive & gesture-driven.** Natural mobile gestures throughout:
  - Swipeable dog cards in matchmaking (Tinder-style swipe to pass / send playdate).
  - Pinch-to-zoom and drag-to-pan on the map; tap a pin to open a dog card.
  - Pull-to-refresh on lists; swipe-back navigation; bottom-sheet panels that drag up/down.
- **Bottom tab navigation** for the main areas: Map · Matches · Chats · Profile (final structure to match the mockup).
- **Minimal taps to value** — Start Walk and "see who's nearby" reachable in one tap from home.
- **Clear sharing status** — the location-sharing banner (FR-6.3) is always visible while walking.

### Performance requirements (NFR-8)
- **60 fps target** for map pan/zoom, card swipes, and scrolling; no jank on mid-range Android devices.
- Map markers efficiently rendered/clustered so many nearby dogs don't degrade frame rate.
- Realtime updates throttled/debounced so live position and chat updates don't thrash the UI.
- Images lazy-loaded and cached; profile photos resized to sensible dimensions before upload.
- App cold-start to interactive map kept fast; heavy work deferred off the first render.
- Gesture interactions handled on the native/UI thread (e.g. via the gesture/animation libraries standard to React Native) to keep them smooth.

---

## 8. Build phases (implementation slices)

Each slice is independently runnable and testable on a phone before proceeding.

| # | Slice | Acceptance / QA focus |
|---|---|---|
| 0 | **Setup** — Expo app runs, Supabase project created, RTL + branding shell (כלב LOVE splash), QR → app on phone | App launches on the QA owner's phone; name renders RTL correctly |
| 1 | **Auth** — Google sign-in, email sign-up, **18+ age gate**, log in/out, first-run data-exposure notice | Google login, account creation, **under-18 sign-up blocked**, wrong-password error, session persistence, notice shown |
| 2 | **Profiles** — owner profile (name, photo, **age, gender**, bio) + dog profiles (name, **type, age, photo** required, description optional), photo upload | Create/edit, required-field validation, photo upload/replace |
| 3 | **Map base** — Mapbox renders, user location, radius picker | Map loads, location shown, radius switches |
| 4 | **Live walk** — Start/End walk, pre-walk data-exposure notice, sharing banner, pin appears/disappears, nearby count | Two phones see each other; notice + banner shown; pin clears on End Walk |
| 5 | **Matchmaking** — swipeable nearby dog cards, request/accept/decline playdate | Full request lifecycle across two accounts; swipe gestures feel smooth |
| 6 | **Chat** — messaging after accepted playdate, real-time + push | Live send/receive, offline push notification |
| 7 | **Search** — search dogs by type; search users by location, age, gender | Type filter returns matching dogs; user filters combine; non-discoverable users hidden |
| 8 | **Calendar** — schedule a playdate (date/time, location, dog + owner); both calendars update; cancel + notify | Entry visible on both accounts; correct date/time/location/dog/owner; cancel notifies |
| 9 | **Privacy center** — view/manage what's shared, permission explanations, delete account & data | Toggle visibility, delete account removes data |

**QA loop per slice:** code written → exact run commands provided → QA owner runs and tests on phone → defects reported → fixed → re-verified → next slice.

**Testing prerequisite:** Slices 4–6 require **two devices** (or two accounts on two phones) to validate proximity, matchmaking, and chat.

---

## 9. Cost estimate

### 9.1 Running cost (monthly) @ 200 active users

| Item | Cost | Notes |
|---|---|---|
| Supabase (auth, DB, realtime, storage) | $0 | Free tier covers MVP scale |
| Mapbox | $0 | Free up to ~25,000 monthly active users |
| Photo storage (~2–5 GB) | ~$0–2 | Within/near free allowance |
| Push notifications (Expo/FCM) | $0 | Free |
| **Total** | **~$0–5 / month** | |

### 9.2 Scaling reference

| Users | Approx. cost/month |
|---|---|
| 200 | ~$0–5 |
| 1,000 | ~$0–30 |
| 10,000 | ~$70–250 |
| 100,000 | ~$500–2,000+ |

### 9.3 Cost-control levers
- Use Mapbox / OpenStreetMap rather than raw Google Maps.
- Throttle location updates (~20s, active walks only).
- Add spatial index on `walk_sessions.location` to keep radius queries cheap.

### 9.4 Build cost
With the QA owner as tester and Claude Code writing the code, direct build cost is effectively $0. (Reference: freelancers $8k–$30k; agencies $40k–$120k+.)

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Map provider cost spikes at scale | Mapbox free tier covers MVP; revisit provider before large growth |
| Battery drain from GPS | Updates only during active walks, throttled interval |
| Privacy concerns / trust | Explicit walk-based sharing, immediate stop on End Walk, clear permission prompts |
| Two-device testing not arranged | Line up a second phone/account before Slice 4 |
| Data leakage between users | RLS enabled and tested from day one |
| Expo/managed-workflow limitations | MVP features are all supported; if a native module is later required, eject/dev-build path exists |

---

## 11. Future phases (post-MVP)

- Fitness challenges (step/distance goals, leaderboards).
- Photo feed / social wall (Instagram-style).
- Scheduled walks (set planned walk times, notify nearby owners).
- Dog habit tracking (recurring behavior logs).
- iPhone release (build from the same codebase).
- Group walks / events; reviews/ratings; reporting & moderation.

Each future feature follows its own design → spec → plan → implementation cycle.

---

## 12. Glossary

- **Expo / Expo Go** — toolchain and companion app that runs a React Native app on a phone via QR code without a native build.
- **Supabase** — managed backend providing auth, Postgres database, realtime, and storage.
- **PostGIS** — PostgreSQL extension for geographic/spatial queries (e.g., radius search).
- **RLS (Row-Level Security)** — database rules restricting which rows each user can read/write.
- **Realtime** — Supabase feature pushing live database changes to connected clients.
- **Walk session** — the active state in which a user shares their dog's live location on the map.
