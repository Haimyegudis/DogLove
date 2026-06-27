# DogLove — Technical Requirements Document

> **Tinder meets Waze for dogs and their owners** — a live map of dogs out walking right now, plus playdate matchmaking and chat.

**Version:** 1.0
**Date:** 2026-06-27
**Status:** Approved design — ready for implementation planning
**Author:** Product owner (QA) + Claude Code

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

1. **Authentication** — email + password sign up / log in / log out.
2. **Profiles** — one owner profile, one or more dog profiles, with photos.
3. **Live map + radius** — see active dogs nearby, choose a search radius, see how many dogs are active around you. Location is shared **only** while the user is "out on a walk."
4. **Matchmaking** — browse nearby dogs and send a playdate request.
5. **Chat** — real-time messaging between owners after a playdate is accepted.

### 1.2 Out of scope for MVP

Fitness challenges, photo feed / social wall, scheduled walks, habit tracking, iPhone release (the chosen stack supports it later at near-zero extra cost), payments.

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
| Backend / DB / Auth / Realtime / Storage | **Supabase** | Single managed service covering accounts, Postgres database, real-time subscriptions, file storage. PostGIS gives built-in geographic radius queries. Generous free tier. |
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
| photo_url | text | nullable; points to Supabase Storage |
| bio | text | nullable |
| push_token | text | nullable; Expo push token for notifications |
| created_at | timestamptz | default now() |

### 4.2 `dogs`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| owner_id | uuid (FK → profiles.id) | required |
| name | text | required |
| breed | text | nullable |
| age | int | nullable (years) |
| size | text | enum-like: `S` / `M` / `L` |
| photo_url | text | nullable |
| bio | text | nullable |
| created_at | timestamptz | default now() |

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

### 4.7 Photos

Dog and owner images are stored in **Supabase Storage** buckets (e.g. `avatars`, `dog-photos`). Database tables store only the resulting `photo_url`. No images are stored in the database itself.

---

## 5. Functional requirements & flows

### 5.1 Authentication
- FR-1.1 User can sign up with email + password.
- FR-1.2 User can log in and log out.
- FR-1.3 Invalid credentials show a clear error.
- FR-1.4 A new auth user automatically gets a `profiles` row (via trigger or first-login bootstrap).

### 5.2 Profiles
- FR-2.1 User can create/edit their owner profile (name, bio, photo).
- FR-2.2 User can add one or more dogs (name, breed, age, size, bio, photo).
- FR-2.3 User can upload and replace photos for owner and dogs.
- FR-2.4 Basic validation (required fields, age numeric, image size limit).

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
- Location data minimized: only lat/lng of an active walk is readable by others; no history retained beyond the active session in MVP.
- Auth handled entirely by Supabase Auth (hashed passwords, session tokens managed by the platform).
- Secrets (Supabase keys, Mapbox token) stored in Expo environment config, not committed to source control. Only the public anon key ships in the app; RLS is the real protection layer.

---

## 8. Build phases (implementation slices)

Each slice is independently runnable and testable on a phone before proceeding.

| # | Slice | Acceptance / QA focus |
|---|---|---|
| 0 | **Setup** — Expo app runs, Supabase project created, QR → blank app on phone | App launches on the QA owner's phone |
| 1 | **Auth** — sign up, log in, log out | Account creation, wrong-password error, session persistence |
| 2 | **Profiles** — owner + dog profiles, photo upload | Create/edit, validation, photo upload/replace |
| 3 | **Map base** — Mapbox renders, user location, radius picker | Map loads, location shown, radius switches |
| 4 | **Live walk** — Start/End walk, pin appears/disappears, nearby count | Two phones see each other; pin clears on End Walk |
| 5 | **Matchmaking** — nearby dogs, request/accept/decline playdate | Full request lifecycle across two accounts |
| 6 | **Chat** — messaging after accepted playdate, real-time + push | Live send/receive, offline push notification |

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
