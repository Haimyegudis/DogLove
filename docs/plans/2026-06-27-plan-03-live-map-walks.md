# כלב LOVE — Plan 03: Live Map & Walk Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an owner tap **Start Walk** to put their dog live on a shared map, see other dogs currently walking within a chosen radius (1/3/5 km) with a live "active dogs nearby" count, and disappear from everyone's map on **End Walk** — location shared only while a walk is active.

**Architecture:** Continues the Expo SDK 54 + Supabase stack, adding **PostGIS** (geo radius queries) and **native Mapbox** via `@rnmapbox/maps`. Because native map modules do NOT run in Expo Go, this slice ships in an **EAS development build** (a custom dev client installed once, then reused like Expo Go). Geo writes/reads go through Postgres RPC functions (so the client never hand-builds WKT); live positions arrive via Supabase Realtime. The app gains a bottom-tab shell — **Map** (primary) + **Profile** (the Plan 02 home).

**Tech Stack:** Expo SDK 54, TypeScript, `@supabase/supabase-js`, **PostGIS**, **@rnmapbox/maps**, `expo-location`, `expo-dev-client`, EAS Build, Supabase Realtime, Jest + `@testing-library/react-native`.

## Global Constraints

- App name **כלב LOVE** (Hebrew **כלב** right, **LOVE** left). RTL first-class on all new screens.
- TypeScript everywhere. Jest + @testing-library/react-native. Keep the suite green; `npm test` before each commit.
- **Privacy (hard rule):** a dog's live location is written ONLY while its `walk_sessions.is_active = true`. **End Walk** sets `is_active = false` and the pin disappears for everyone. No background tracking; location updates stop when no walk is active. A visible "sharing location" banner shows while walking.
- **Update cadence:** while walking, push GPS every **~20 seconds** (not continuously) — balances freshness, battery, and cost.
- **Radius options:** 1 / 3 / 5 km.
- Geo writes/reads go through **RPC functions** (`start_walk`, `end_walk`, `update_walk_location`, `nearby_active_dogs`) — the client passes lat/lng numbers, never raw WKT.
- **RLS on every table.** `walk_sessions` is world-readable (the map needs others' active pins) but writable only by the dog's owner.
- Native Mapbox runs in an **EAS dev build**, NOT Expo Go. Mapbox access token + EAS account are the user's to provide; all config/code is in this plan.
- Secrets via Expo env (`.env` git-ignored): add `MAPBOX_DOWNLOAD_TOKEN` (build-time) and `MAPBOX_PUBLIC_TOKEN` (runtime).
- Follow `src/theme.ts` (colors/font/radius/shadow) and reuse `DogParkBackground`, `Avatar`.

**Repo root:** `C:\Apps\DogLove` (git repo, branch `feat/plan-01-foundation-auth`). All paths below are under this root.

**Migrations:** the controller applies migration `0003` to Supabase via the pooler script (`scratchpad/apply-pooler.js`) using the DB connection — the user does NOT paste SQL. Pooler host for this project: `aws-1-ap-southeast-1.pooler.supabase.com`, user `postgres.jynyrowglsojakfwcufm`.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0003_walk_sessions_postgis.sql` | Enable PostGIS; `walk_sessions` table + RLS; RPCs `start_walk`/`end_walk`/`update_walk_location`/`nearby_active_dogs` |
| `src/services/location.ts` | `requestLocationPermission`, `getCurrentCoords`, `watchCoords` (expo-location wrappers) |
| `src/services/walk.ts` | `startWalk`, `endWalk`, `updateWalkLocation`, `nearbyDogs` (RPC wrappers) |
| `src/services/walkRealtime.ts` | `subscribeActiveWalks(cb)` — Supabase Realtime subscription to walk_sessions changes |
| `src/types/walk.ts` | `Coords`, `NearbyDog` types |
| `src/lib/mapbox.ts` | Initialize Mapbox access token from env |
| `app.config.ts` | Add `@rnmapbox/maps` config plugin (download token), `expo-location` plugin + permission strings, dev-client |
| `eas.json` | EAS build profiles (development dev-client, preview) |
| `app/(app)/(tabs)/_layout.tsx` | Bottom tabs: Map + Profile (RTL, themed) |
| `app/(app)/(tabs)/index.tsx` | **Map** screen (primary tab): map, user location, walk controls, markers, radius, count |
| `app/(app)/(tabs)/profile.tsx` | Profile tab — re-exports the Plan 02 home content |
| `src/components/WalkControls.tsx` | Start/End walk button + radius selector + nearby count + sharing banner |
| `__tests__/location.test.ts` | Tests for location service |
| `__tests__/walk.test.ts` | Tests for walk service (mocked rpc) |
| `__tests__/walkRealtime.test.ts` | Tests for the realtime subscription helper |

**Routing note:** Plan 02 put the profile at `app/(app)/home.tsx`. This plan moves the app's signed-in area under a tab group `app/(app)/(tabs)/`. The Map is `index` (default tab); Profile moves into `profile.tsx`. `app/(app)/home.tsx` is deleted and its redirect target updated (Task 7). The existing `app/(app)/edit-profile.tsx` and `app/(app)/dog/[id].tsx` stay where they are (pushed as modals over the tabs).

---

## Task 1: Migration 0003 — PostGIS, walk_sessions, RPCs

**Files:**
- Create: `supabase/migrations/0003_walk_sessions_postgis.sql`

**Interfaces:**
- Consumes: `dogs` table (Plan 02).
- Produces: `walk_sessions` table; RPCs `start_walk(p_dog_id uuid, p_lat float8, p_lng float8)`, `end_walk(p_dog_id uuid)`, `update_walk_location(p_dog_id uuid, p_lat float8, p_lng float8)`, `nearby_active_dogs(p_lat float8, p_lng float8, p_radius_m float8)`.

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/0003_walk_sessions_postgis.sql`:
```sql
create extension if not exists postgis;

-- One walk_sessions row per dog (toggled active); drives the live map.
create table if not exists public.walk_sessions (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null unique references public.dogs (id) on delete cascade,
  is_active boolean not null default false,
  location geography(Point, 4326),
  updated_at timestamptz not null default now()
);

create index if not exists walk_sessions_active_idx on public.walk_sessions (is_active);
create index if not exists walk_sessions_location_idx on public.walk_sessions using gist (location);

alter table public.walk_sessions enable row level security;

-- World-readable (others' active pins); writable only by the dog's owner.
drop policy if exists "ws_select_all" on public.walk_sessions;
create policy "ws_select_all" on public.walk_sessions for select using (true);

drop policy if exists "ws_insert_own" on public.walk_sessions;
create policy "ws_insert_own" on public.walk_sessions for insert
  with check (exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid()));

drop policy if exists "ws_update_own" on public.walk_sessions;
create policy "ws_update_own" on public.walk_sessions for update
  using (exists (select 1 from public.dogs d where d.id = walk_sessions.dog_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.dogs d where d.id = walk_sessions.dog_id and d.owner_id = auth.uid()));

drop policy if exists "ws_delete_own" on public.walk_sessions;
create policy "ws_delete_own" on public.walk_sessions for delete
  using (exists (select 1 from public.dogs d where d.id = walk_sessions.dog_id and d.owner_id = auth.uid()));

-- RPCs (security invoker → RLS still applies). Clients pass lat/lng numbers.
create or replace function public.start_walk(p_dog_id uuid, p_lat float8, p_lng float8)
returns void language sql as $$
  insert into public.walk_sessions (dog_id, is_active, location, updated_at)
  values (p_dog_id, true, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, now())
  on conflict (dog_id) do update
    set is_active = true,
        location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        updated_at = now();
$$;

create or replace function public.update_walk_location(p_dog_id uuid, p_lat float8, p_lng float8)
returns void language sql as $$
  update public.walk_sessions
    set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        updated_at = now()
    where dog_id = p_dog_id and is_active = true;
$$;

create or replace function public.end_walk(p_dog_id uuid)
returns void language sql as $$
  update public.walk_sessions set is_active = false, updated_at = now()
    where dog_id = p_dog_id;
$$;

-- Active dogs within p_radius_m metres of (p_lat,p_lng), nearest first.
create or replace function public.nearby_active_dogs(p_lat float8, p_lng float8, p_radius_m float8)
returns table (
  dog_id uuid, name text, breed text, photo_url text,
  lat float8, lng float8, distance_m float8
) language sql stable as $$
  select d.id, d.name, d.breed, d.photo_url,
    st_y(ws.location::geometry) as lat,
    st_x(ws.location::geometry) as lng,
    st_distance(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.walk_sessions ws
  join public.dogs d on d.id = ws.dog_id
  where ws.is_active = true
    and ws.location is not null
    and st_dwithin(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc;
$$;
```

- [ ] **Step 2: Apply the migration (controller, via pooler script)**

The controller runs:
```bash
cd /c/Apps/DogLove && NODE_PATH="/c/Apps/DogLove/node_modules" PROJECT_REF="jynyrowglsojakfwcufm" PGPASSWORD='<db-password>' node "<scratchpad>/apply-pooler.js" /c/Apps/DogLove/supabase/migrations/0003_walk_sessions_postgis.sql
```
Expected output includes `APPLIED 0003_walk_sessions_postgis.sql`. (If the DB password was rotated, ask the user for the current one.) The user does NOT paste SQL.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_walk_sessions_postgis.sql
git commit -m "feat(db): PostGIS, walk_sessions table, RLS, and geo RPCs"
```

---

## Task 2: Walk + Coords types

**Files:**
- Create: `src/types/walk.ts`

**Interfaces:**
- Produces:
  - `interface Coords { lat: number; lng: number }`
  - `interface NearbyDog { dog_id: string; name: string; breed: string; photo_url: string; lat: number; lng: number; distance_m: number }`

- [ ] **Step 1: Create the types**

`src/types/walk.ts`:
```ts
export interface Coords {
  lat: number;
  lng: number;
}

export interface NearbyDog {
  dog_id: string;
  name: string;
  breed: string;
  photo_url: string;
  lat: number;
  lng: number;
  distance_m: number;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/walk.ts
git commit -m "feat(types): add Coords and NearbyDog types"
```

---

## Task 3: Location service

**Files:**
- Create: `src/services/location.ts`
- Test: `__tests__/location.test.ts`

**Interfaces:**
- Consumes: `expo-location`; `Coords` from `src/types/walk.ts`.
- Produces:
  - `requestLocationPermission(): Promise<boolean>`
  - `getCurrentCoords(): Promise<Coords | null>`
  - `watchCoords(onCoords: (c: Coords) => void, intervalMs?: number): Promise<{ remove: () => void }>`

- [ ] **Step 1: Write the failing tests**

`__tests__/location.test.ts`:
```ts
const requestForegroundPermissionsAsync = jest.fn();
const getCurrentPositionAsync = jest.fn();
const watchPositionAsync = jest.fn();
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  watchPositionAsync,
  Accuracy: { Balanced: 3 },
}));
import { requestLocationPermission, getCurrentCoords, watchCoords } from '../src/services/location';

beforeEach(() => jest.clearAllMocks());

test('requestLocationPermission returns true when granted', async () => {
  requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  expect(await requestLocationPermission()).toBe(true);
});

test('getCurrentCoords maps the expo position to Coords', async () => {
  getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 32.1, longitude: 34.8 } });
  const c = await getCurrentCoords();
  expect(c).toEqual({ lat: 32.1, lng: 34.8 });
});

test('watchCoords forwards mapped coords to the callback', async () => {
  let captured: any;
  watchPositionAsync.mockImplementation((_opts: any, cb: any) => {
    captured = cb;
    return Promise.resolve({ remove: jest.fn() });
  });
  const onCoords = jest.fn();
  await watchCoords(onCoords);
  captured({ coords: { latitude: 1, longitude: 2 } });
  expect(onCoords).toHaveBeenCalledWith({ lat: 1, lng: 2 });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest __tests__/location.test.ts`
Expected: FAIL ("Cannot find module '../src/services/location'").

- [ ] **Step 3: Implement the service**

`src/services/location.ts`:
```ts
import * as Location from 'expo-location';
import type { Coords } from '../types/walk';

export async function requestLocationPermission(): Promise<boolean> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

export async function getCurrentCoords(): Promise<Coords | null> {
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  if (!pos) return null;
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export async function watchCoords(onCoords: (c: Coords) => void, intervalMs = 20000) {
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: intervalMs, distanceInterval: 10 },
    (pos) => onCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
  );
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx jest __tests__/location.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/location.ts __tests__/location.test.ts
git commit -m "feat(location): add expo-location service wrappers"
```

---

## Task 4: Walk service (RPC wrappers)

**Files:**
- Create: `src/services/walk.ts`
- Test: `__tests__/walk.test.ts`

**Interfaces:**
- Consumes: `supabase` (its `.rpc`); `Coords`, `NearbyDog` from `src/types/walk.ts`.
- Produces:
  - `startWalk(dogId: string, c: Coords): Promise<{ error: string | null }>`
  - `updateWalkLocation(dogId: string, c: Coords): Promise<{ error: string | null }>`
  - `endWalk(dogId: string): Promise<{ error: string | null }>`
  - `nearbyDogs(c: Coords, radiusM: number): Promise<{ data: NearbyDog[]; error: string | null }>`

- [ ] **Step 1: Write the failing tests**

`__tests__/walk.test.ts`:
```ts
const rpc = jest.fn();
jest.mock('../src/lib/supabase', () => ({ supabase: { rpc } }));
import { startWalk, updateWalkLocation, endWalk, nearbyDogs } from '../src/services/walk';

beforeEach(() => jest.clearAllMocks());

test('startWalk calls start_walk rpc with dog id + lat/lng', async () => {
  rpc.mockResolvedValue({ error: null });
  const res = await startWalk('d1', { lat: 32.1, lng: 34.8 });
  expect(rpc).toHaveBeenCalledWith('start_walk', { p_dog_id: 'd1', p_lat: 32.1, p_lng: 34.8 });
  expect(res.error).toBeNull();
});

test('updateWalkLocation calls update_walk_location rpc', async () => {
  rpc.mockResolvedValue({ error: null });
  await updateWalkLocation('d1', { lat: 1, lng: 2 });
  expect(rpc).toHaveBeenCalledWith('update_walk_location', { p_dog_id: 'd1', p_lat: 1, p_lng: 2 });
});

test('endWalk calls end_walk rpc', async () => {
  rpc.mockResolvedValue({ error: null });
  await endWalk('d1');
  expect(rpc).toHaveBeenCalledWith('end_walk', { p_dog_id: 'd1' });
});

test('nearbyDogs calls nearby_active_dogs and returns rows', async () => {
  rpc.mockResolvedValue({ data: [{ dog_id: 'd2', name: 'Bella' }], error: null });
  const res = await nearbyDogs({ lat: 1, lng: 2 }, 3000);
  expect(rpc).toHaveBeenCalledWith('nearby_active_dogs', { p_lat: 1, p_lng: 2, p_radius_m: 3000 });
  expect(res.data).toHaveLength(1);
  expect(res.error).toBeNull();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest __tests__/walk.test.ts`
Expected: FAIL ("Cannot find module '../src/services/walk'").

- [ ] **Step 3: Implement the service**

`src/services/walk.ts`:
```ts
import { supabase } from '../lib/supabase';
import type { Coords, NearbyDog } from '../types/walk';

export async function startWalk(dogId: string, c: Coords) {
  const { error } = await supabase.rpc('start_walk', { p_dog_id: dogId, p_lat: c.lat, p_lng: c.lng });
  return { error: error?.message ?? null };
}

export async function updateWalkLocation(dogId: string, c: Coords) {
  const { error } = await supabase.rpc('update_walk_location', { p_dog_id: dogId, p_lat: c.lat, p_lng: c.lng });
  return { error: error?.message ?? null };
}

export async function endWalk(dogId: string) {
  const { error } = await supabase.rpc('end_walk', { p_dog_id: dogId });
  return { error: error?.message ?? null };
}

export async function nearbyDogs(c: Coords, radiusM: number) {
  const { data, error } = await supabase.rpc('nearby_active_dogs', { p_lat: c.lat, p_lng: c.lng, p_radius_m: radiusM });
  return { data: (data as NearbyDog[]) ?? [], error: error?.message ?? null };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx jest __tests__/walk.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/walk.ts __tests__/walk.test.ts
git commit -m "feat(walk): add walk RPC service (start/update/end/nearby)"
```

---

## Task 5: Realtime active-walks subscription

**Files:**
- Create: `src/services/walkRealtime.ts`
- Test: `__tests__/walkRealtime.test.ts`

**Interfaces:**
- Consumes: `supabase` (its `.channel`).
- Produces: `subscribeActiveWalks(onChange: () => void): { unsubscribe: () => void }` — subscribes to all `walk_sessions` changes and calls `onChange` on any insert/update/delete (the map then re-queries `nearbyDogs`).

- [ ] **Step 1: Write the failing test**

`__tests__/walkRealtime.test.ts`:
```ts
const subscribe = jest.fn(() => channelObj);
const on = jest.fn(() => channelObj);
const channelObj: any = { on, subscribe };
const channel = jest.fn(() => channelObj);
const removeChannel = jest.fn();
jest.mock('../src/lib/supabase', () => ({ supabase: { channel, removeChannel } }));
import { subscribeActiveWalks } from '../src/services/walkRealtime';

beforeEach(() => jest.clearAllMocks());

test('subscribes to walk_sessions changes and unsubscribes', () => {
  const onChange = jest.fn();
  const sub = subscribeActiveWalks(onChange);
  expect(channel).toHaveBeenCalled();
  expect(on).toHaveBeenCalledWith(
    'postgres_changes',
    expect.objectContaining({ event: '*', schema: 'public', table: 'walk_sessions' }),
    expect.any(Function),
  );
  // simulate an event → onChange fires
  const handler = on.mock.calls[0][2];
  handler({});
  expect(onChange).toHaveBeenCalled();
  sub.unsubscribe();
  expect(removeChannel).toHaveBeenCalledWith(channelObj);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest __tests__/walkRealtime.test.ts`
Expected: FAIL ("Cannot find module '../src/services/walkRealtime'").

- [ ] **Step 3: Implement the helper**

`src/services/walkRealtime.ts`:
```ts
import { supabase } from '../lib/supabase';

export function subscribeActiveWalks(onChange: () => void) {
  const channel = supabase
    .channel('walk_sessions_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'walk_sessions' }, () => onChange())
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx jest __tests__/walkRealtime.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/walkRealtime.ts __tests__/walkRealtime.test.ts
git commit -m "feat(walk): add realtime walk_sessions subscription"
```

---

## Task 6: Mapbox + EAS dev-build configuration

**Files:**
- Create: `src/lib/mapbox.ts`, `eas.json`
- Modify: `app.config.ts`, `.env.example`

**Interfaces:**
- Consumes: env `MAPBOX_DOWNLOAD_TOKEN`, `MAPBOX_PUBLIC_TOKEN`.
- Produces: `initMapbox()` setting the runtime access token; an EAS `development` profile that builds a dev client with the native Mapbox SDK.

- [ ] **Step 1: Install native deps**

Run:
```bash
npx expo install @rnmapbox/maps expo-location expo-dev-client
```

- [ ] **Step 2: Add config plugins + permissions to `app.config.ts`**

Edit `app.config.ts` — extend `plugins` and `extra` (keep all existing entries):
```ts
  plugins: [
    'expo-router',
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    'expo-font',
    'expo-image-picker',
    [
      '@rnmapbox/maps',
      { RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN },
    ],
    [
      'expo-location',
      { locationWhenInUsePermission: 'נשתמש במיקום שלך כדי להראות כלבים קרובים בזמן שאתה בהליכה.' },
    ],
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    mapboxPublicToken: process.env.MAPBOX_PUBLIC_TOKEN,
  },
```

- [ ] **Step 3: Create `eas.json`**

`eas.json`:
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {}
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  }
}
```

- [ ] **Step 4: Implement `src/lib/mapbox.ts`**

`src/lib/mapbox.ts`:
```ts
import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';

export function initMapbox() {
  const token = (Constants.expoConfig?.extra as { mapboxPublicToken?: string } | undefined)?.mapboxPublicToken;
  if (token) Mapbox.setAccessToken(token);
}
```

- [ ] **Step 5: Document env vars**

Append to `.env.example`:
```
MAPBOX_DOWNLOAD_TOKEN=sk.your-secret-download-token
MAPBOX_PUBLIC_TOKEN=pk.your-public-token
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors. (`npm test` should still pass — no test touches Mapbox.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/mapbox.ts eas.json app.config.ts .env.example package.json package-lock.json
git commit -m "chore(map): add Mapbox + expo-location config and EAS dev-build profile"
```

- [ ] **Step 8: MANUAL (user) — Mapbox tokens + build the dev client**

> **This step is the user's, with the controller guiding.** It cannot be unit-tested.
> 1. Create a free **Mapbox account** (mapbox.com) → Account → Tokens. Copy the **default public token** (`pk....`) into `.env` as `MAPBOX_PUBLIC_TOKEN`. Create a **secret scope** token with `Downloads:Read` and put it in `.env` as `MAPBOX_DOWNLOAD_TOKEN`.
> 2. Install EAS CLI: `npm i -g eas-cli`. Run `eas login` (free Expo account).
> 3. Build the dev client: `eas build --profile development --platform android`. Wait ~10–15 min; install the resulting APK on the phone.
> 4. Start the dev server: `npx expo start --dev-client --tunnel`. Open the **installed dev build** (not Expo Go) and connect.

---

## Task 7: Bottom-tab shell (Map + Profile)

**Files:**
- Create: `app/(app)/(tabs)/_layout.tsx`, `app/(app)/(tabs)/profile.tsx`
- Delete: `app/(app)/home.tsx`
- Modify: `app/index.tsx` (redirect target), `app/(auth)/_layout.tsx` (redirect target)

**Interfaces:**
- Consumes: theme; the existing profile-home implementation.
- Produces: a tab navigator with **Map** (`index`) and **Profile** (`profile`) tabs. Signed-in users land on the Map tab.

- [ ] **Step 1: Move the profile home content into the Profile tab**

Create `app/(app)/(tabs)/profile.tsx` with the FULL current contents of `app/(app)/home.tsx` (the Plan 02 profile screen), with one change: any `router.push('/(app)/edit-profile')` / `'/(app)/dog/...'` paths stay the same (those routes live one level up and remain valid). Then delete `app/(app)/home.tsx`.

(The exact code is the current `app/(app)/home.tsx`; copy it verbatim into `profile.tsx`. Do not re-implement.)

- [ ] **Step 2: Create the tab layout**

`app/(app)/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors, font } from '../../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coralDeep,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'מפה', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🗺️</Text> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'פרופיל', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🐶</Text> }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Update redirect targets**

In `app/index.tsx`, change the signed-in redirect from `/(app)/home` to `/(app)/(tabs)`:
```tsx
  return <Redirect href="/(app)/(tabs)" />;
```
In `app/(auth)/_layout.tsx`, change `if (session) return <Redirect href="/(app)/home" />;` to:
```tsx
  if (session) return <Redirect href="/(app)/(tabs)" />;
```
Also update the sign-out path-less flow: in `profile.tsx`, the sign-out still calls `signOut()` (the `(app)` layout guard already redirects to login). Any `router.replace('/(app)/home')` inside `edit-profile.tsx` and `dog/[id].tsx` must become `router.replace('/(app)/(tabs)')` — update those two lines.

- [ ] **Step 4: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/(tabs)" app/index.tsx "app/(auth)/_layout.tsx" "app/(app)/edit-profile.tsx" "app/(app)/dog/[id].tsx"
git rm "app/(app)/home.tsx"
git commit -m "feat(nav): add Map+Profile bottom tabs; move profile into tab"
```

---

## Task 8: Walk controls component

**Files:**
- Create: `src/components/WalkControls.tsx`

**Interfaces:**
- Consumes: theme.
- Produces: `<WalkControls walking radiusM nearbyCount onToggleWalk onSelectRadius />` where:
  - `walking: boolean`, `radiusM: number`, `nearbyCount: number`
  - `onToggleWalk: () => void`, `onSelectRadius: (m: number) => void`
  Renders the radius chips (1/3/5 km), the live nearby count, a Start/End walk button, and (while walking) a "sharing location" banner.

- [ ] **Step 1: Implement the component**

`src/components/WalkControls.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, font, radius as r, shadow } from '../theme';

const RADII = [
  { m: 1000, label: '1 ק"מ' },
  { m: 3000, label: '3 ק"מ' },
  { m: 5000, label: '5 ק"מ' },
];

type Props = {
  walking: boolean;
  radiusM: number;
  nearbyCount: number;
  onToggleWalk: () => void;
  onSelectRadius: (m: number) => void;
};

export default function WalkControls({ walking, radiusM, nearbyCount, onToggleWalk, onSelectRadius }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {walking && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🟢 בהליכה — המיקום שלך משותף</Text>
        </View>
      )}

      <View style={[styles.card, shadow.card]}>
        <View style={styles.row}>
          <Text style={styles.count}>{nearbyCount}</Text>
          <Text style={styles.countLabel}>כלבים פעילים בקרבתך 🐾</Text>
        </View>

        <View style={styles.chips}>
          {RADII.map((opt) => (
            <Pressable
              key={opt.m}
              onPress={() => onSelectRadius(opt.m)}
              style={[styles.chip, radiusM === opt.m && styles.chipOn]}
            >
              <Text style={[styles.chipText, radiusM === opt.m && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          testID="toggle-walk"
          onPress={onToggleWalk}
          style={({ pressed }) => [styles.cta, walking ? styles.ctaEnd : styles.ctaStart, shadow.soft, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{walking ? 'סיום הליכה' : 'יוצאים לטיול! 🦮'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10 },
  banner: { alignSelf: 'center', backgroundColor: colors.white, borderRadius: r.pill, paddingVertical: 8, paddingHorizontal: 16, ...shadow.soft },
  bannerText: { fontFamily: font.bold, color: colors.bark, fontSize: 13 },
  card: { backgroundColor: colors.white, borderRadius: r.lg, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8, justifyContent: 'center' },
  count: { fontFamily: font.black, fontSize: 26, color: colors.coralDeep },
  countLabel: { fontFamily: font.medium, fontSize: 14, color: colors.caramel },
  chips: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: r.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { borderRadius: r.pill, paddingVertical: 16, alignItems: 'center' },
  ctaStart: { backgroundColor: colors.coral },
  ctaEnd: { backgroundColor: colors.bark },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
```

- [ ] **Step 2: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/WalkControls.tsx
git commit -m "feat(map): add walk controls (radius, count, start/end, banner)"
```

---

## Task 9: Map screen — Mapbox, location, walk, markers, realtime

**Files:**
- Create: `app/(app)/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `initMapbox` (src/lib/mapbox); `requestLocationPermission`, `getCurrentCoords`, `watchCoords` (src/services/location); `startWalk`, `endWalk`, `updateWalkLocation`, `nearbyDogs` (src/services/walk); `subscribeActiveWalks` (src/services/walkRealtime); `listMyDogs` (src/services/dogs); `useAuth`; `WalkControls`; `Coords`, `NearbyDog`; theme; `@rnmapbox/maps`.
- Produces: the Map tab. On mount: init Mapbox, request location, center on the user, load nearby dogs at the current radius, render markers + count. Start Walk → pick the user's (first) dog, write an active session, begin 20s location updates. End Walk → stop updates, end session. Realtime changes re-query nearby dogs.

- [ ] **Step 1: Implement the Map screen**

`app/(app)/(tabs)/index.tsx`:
```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { initMapbox } from '../../../src/lib/mapbox';
import { requestLocationPermission, getCurrentCoords, watchCoords } from '../../../src/services/location';
import { startWalk, endWalk, updateWalkLocation, nearbyDogs } from '../../../src/services/walk';
import { subscribeActiveWalks } from '../../../src/services/walkRealtime';
import { listMyDogs } from '../../../src/services/dogs';
import { useAuth } from '../../../src/state/AuthContext';
import WalkControls from '../../../src/components/WalkControls';
import type { Coords, NearbyDog } from '../../../src/types/walk';
import { colors, font } from '../../../src/theme';

initMapbox();

export default function MapScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const [coords, setCoords] = useState<Coords | null>(null);
  const [radiusM, setRadiusM] = useState(3000);
  const [dogs, setDogs] = useState<NearbyDog[]>([]);
  const [walking, setWalking] = useState(false);
  const walkDogId = useRef<string | null>(null);
  const watcher = useRef<{ remove: () => void } | null>(null);

  // Initial location + permission
  useEffect(() => {
    (async () => {
      const ok = await requestLocationPermission();
      if (!ok) { Alert.alert('צריך הרשאת מיקום', 'כדי להראות כלבים קרובים, אפשר גישה למיקום.'); return; }
      const c = await getCurrentCoords();
      if (c) setCoords(c);
    })();
    return () => { watcher.current?.remove(); };
  }, []);

  const refreshNearby = useCallback(async (c: Coords, rM: number) => {
    const { data } = await nearbyDogs(c, rM);
    setDogs(data);
  }, []);

  // Re-query when location/radius change
  useEffect(() => { if (coords) refreshNearby(coords, radiusM); }, [coords, radiusM, refreshNearby]);

  // Realtime: any walk change → re-query
  useEffect(() => {
    const sub = subscribeActiveWalks(() => { if (coords) refreshNearby(coords, radiusM); });
    return () => sub.unsubscribe();
  }, [coords, radiusM, refreshNearby]);

  async function onToggleWalk() {
    if (walking) {
      watcher.current?.remove();
      watcher.current = null;
      if (walkDogId.current) await endWalk(walkDogId.current);
      walkDogId.current = null;
      setWalking(false);
      if (coords) refreshNearby(coords, radiusM);
      return;
    }
    // Start: need a dog + a location
    const { data: myDogs } = await listMyDogs(userId);
    if (myDogs.length === 0) { Alert.alert('אין כלב', 'הוסף קודם פרופיל כלב כדי לצאת לטיול.'); return; }
    const c = coords ?? (await getCurrentCoords());
    if (!c) { Alert.alert('אין מיקום', 'לא הצלחנו לקבל מיקום.'); return; }
    const dogId = myDogs[0].dog_id ?? (myDogs[0] as any).id;
    const { error } = await startWalk(dogId, c);
    if (error) { Alert.alert('שגיאה', error); return; }
    walkDogId.current = dogId;
    setWalking(true);
    // push location every ~20s
    watcher.current = await watchCoords(async (nc) => {
      setCoords(nc);
      if (walkDogId.current) await updateWalkLocation(walkDogId.current, nc);
    });
  }

  const center: [number, number] = coords ? [coords.lng, coords.lat] : [34.78, 32.08]; // fallback: Tel Aviv

  return (
    <View style={styles.fill}>
      <Mapbox.MapView style={styles.fill} styleURL={Mapbox.StyleURL.Street}>
        <Mapbox.Camera zoomLevel={14} centerCoordinate={center} animationDuration={600} />
        {coords && (
          <Mapbox.PointAnnotation id="me" coordinate={[coords.lng, coords.lat]}>
            <View style={styles.me} />
          </Mapbox.PointAnnotation>
        )}
        {dogs.map((d) => (
          <Mapbox.PointAnnotation key={d.dog_id} id={d.dog_id} coordinate={[d.lng, d.lat]}>
            <View style={styles.dogPin}><Text style={styles.dogPinText}>🐕</Text></View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      <WalkControls
        walking={walking}
        radiusM={radiusM}
        nearbyCount={dogs.length}
        onToggleWalk={onToggleWalk}
        onSelectRadius={setRadiusM}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  me: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.sky, borderWidth: 3, borderColor: colors.white },
  dogPin: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  dogPinText: { fontSize: 20 },
});
```

- [ ] **Step 2: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: all tests pass (no test imports the Mapbox screen).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(tabs)/index.tsx"
git commit -m "feat(map): live map screen with walk, radius, markers, realtime"
```

- [ ] **Step 4: MANUAL (user) — on-device verification in the dev build**

> Cannot run in Expo Go or unit tests. In the **dev build** (Task 6 Step 8):
> 1. Open the Map tab → grant location → the map centers on you, blue dot shows.
> 2. Tap **יוצאים לטיול** → the sharing banner appears; on a **second device/account**, your dog pin appears on their map within ~20s; the count increments.
> 3. Tap **סיום הליכה** → your pin disappears for the other device.
> 4. Change radius (1/3/5) → count/markers update.

---

## Self-Review (completed)

**Spec coverage (Live map + radius, Flow A & B):**
- `walk_sessions` (dog_id, is_active, location, updated_at) → Task 1. ✓
- PostGIS radius "active dogs within X km" → Task 1 `nearby_active_dogs` RPC + Task 4 `nearbyDogs`. ✓
- Start Walk → active session + location; End Walk → inactive, pin disappears → Tasks 1, 4, 9. ✓
- Location shared ONLY while active; ~20s cadence; stops on end → Task 9 (`watchCoords` started on Start, removed on End) + Task 3 (20s default). ✓
- Radius 1/3/5 km selector + live count → Tasks 8, 9. ✓
- Live positions via Realtime → Tasks 5, 9. ✓
- Sharing banner (privacy visibility) → Task 8. ✓
- Map-first bottom tabs → Task 7. ✓
- Native Mapbox in EAS dev build → Task 6. ✓

**Deferred to later plans:** matchmaking/playdates (Plan 04), chat (Plan 05), search, playdate calendar, privacy center. The `home_location` column (coarse location for user search) is a Plan with search, not here.

**Placeholder scan:** No TBD/TODO; every code step has complete code. The two manual steps (Task 6 Step 8, Task 9 Step 4) are external (Mapbox/EAS/device) and explicitly marked — they cannot be unit-tested.

**Type consistency:** `Coords {lat,lng}` and `NearbyDog` defined in Task 2, used identically in Tasks 3, 4, 9. Service signatures (`requestLocationPermission`, `getCurrentCoords`, `watchCoords`, `startWalk`, `updateWalkLocation`, `endWalk`, `nearbyDogs`, `subscribeActiveWalks`) match producer/consumer across tasks. RPC names + param names (`p_dog_id`/`p_lat`/`p_lng`/`p_radius_m`) match between the migration (Task 1) and the service (Task 4). ✓

**Known risk:** `listMyDogs` returns rows with `id` (not `dog_id`); Task 9 handles both shapes (`myDogs[0].dog_id ?? myDogs[0].id`). Start Walk uses the owner's first dog (multi-dog selection is a later refinement, noted not silently dropped).
```
