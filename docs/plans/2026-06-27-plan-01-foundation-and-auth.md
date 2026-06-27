# כלב LOVE — Plan 01: Foundation & Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the כלב LOVE mobile app so it launches on a real phone with correct RTL branding, and a user can sign in with Google or email/password, see a first-run data-exposure notice, and land on a placeholder Home screen — with a `profiles` row created automatically.

**Architecture:** React Native + Expo (managed, TypeScript) client talking directly to Supabase for auth, database, and (later) realtime/storage. This plan delivers Slices 0 (Setup) and 1 (Auth) from the spec. Auth logic lives in a thin, unit-tested service layer wrapping the Supabase client; screens are kept dumb and call the service. Session state drives a simple auth router (signed-out → auth stack; signed-in → app stack).

**Tech Stack:** Expo SDK (managed workflow), TypeScript, `@supabase/supabase-js`, Expo Router (file-based navigation), Supabase Auth (Google OAuth + email/password), Jest + `@testing-library/react-native` for tests, `expo-auth-session` / Supabase OAuth for Google, `react-native-url-polyfill`, `@react-native-async-storage/async-storage` for session persistence.

## Global Constraints

- App name (user-facing): **כלב LOVE** — Hebrew **כלב** on the right, **LOVE** on the left. Internal/project name: `DogLove`.
- **RTL** is a first-class layout direction; the app forces RTL and must render correctly right-to-left.
- Auth: support **Google sign-in** AND **email/password**. App never handles the user's Google password.
- **Privacy:** show a first-run **data-exposure notice** before any data is shared; consent required to proceed.
- **Row-Level Security (RLS)** enabled on every table from creation.
- Secrets (Supabase URL/anon key, Mapbox token) live in Expo env config (`app.config.ts` + `.env`), never committed. `.env` is git-ignored.
- Language: **TypeScript** everywhere. Tests use **Jest** + `@testing-library/react-native`.
- Commit frequently — one commit per completed step group as indicated.
- Visual fidelity to the mockup is pending screenshots; auth/notice screens in this plan are functional and minimally styled, to be re-skinned later.

**Repo root for all paths:** `C:\Apps\DogLove` (a git repo already exists here with the spec committed). All relative paths below are under this root.

---

## File Structure

| File | Responsibility |
|---|---|
| `app.config.ts` | Expo app config: name, slug, RTL flag, env injection (Supabase keys via `extra`) |
| `.env` | Local secrets (git-ignored): `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `.env.example` | Committed template of required env vars (no real values) |
| `.gitignore` | Ignore `node_modules`, `.env`, Expo/build artifacts |
| `package.json` | Dependencies + scripts (`start`, `test`, `lint`) |
| `tsconfig.json` | TypeScript config (Expo base) |
| `jest.config.js` | Jest config using `jest-expo` preset |
| `src/lib/supabase.ts` | Configured Supabase client singleton (AsyncStorage session persistence) |
| `src/services/auth.ts` | Auth service: `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signOut`, `getSession`, `onAuthStateChange` |
| `src/services/profile.ts` | `ensureProfile(userId, provider)` — creates the `profiles` row if missing |
| `src/state/AuthContext.tsx` | React context exposing `session`, `loading`, and auth actions |
| `src/state/consent.ts` | `hasSeenDataNotice()` / `setDataNoticeSeen()` using AsyncStorage |
| `supabase/migrations/0001_profiles.sql` | `profiles` table + RLS policies + new-user trigger |
| `app/_layout.tsx` | Root layout: forces RTL, wraps app in `AuthProvider`, routes by auth+consent state |
| `app/index.tsx` | Entry redirect based on session/consent |
| `app/notice.tsx` | First-run data-exposure notice screen |
| `app/(auth)/login.tsx` | Login screen (Google button + email form, link to sign-up) |
| `app/(auth)/signup.tsx` | Email sign-up screen |
| `app/(app)/home.tsx` | Placeholder Home (post-login) with branded header + Sign out |
| `src/components/BrandLockup.tsx` | Renders the כלב LOVE name lockup (RTL) |
| `__tests__/auth.test.ts` | Unit tests for auth service (mocked Supabase) |
| `__tests__/profile.test.ts` | Unit tests for `ensureProfile` |
| `__tests__/consent.test.ts` | Unit tests for consent storage helpers |
| `__tests__/BrandLockup.test.tsx` | Render test for brand lockup |

---

## Task 1: Initialize Expo TypeScript project + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `app.config.ts`, `.gitignore`, `.env.example`, `jest.config.js`, `app/index.tsx`, `app/_layout.tsx`
- Test: `__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a runnable Expo Router app and a working Jest setup that later tasks extend.

- [ ] **Step 1: Scaffold the Expo app (TypeScript, Expo Router)**

Run in `C:\Apps\DogLove`:
```bash
npx create-expo-app@latest . --template expo-template-blank-typescript
```
If the directory-not-empty prompt appears, choose to continue (the repo already has `TECHNICAL_REQUIREMENTS.md` and `docs/`). Then add navigation + libs:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants @react-native-async-storage/async-storage react-native-url-polyfill
npm install @supabase/supabase-js
npm install -D jest jest-expo @testing-library/react-native @types/jest @testing-library/jest-native
```

- [ ] **Step 2: Configure Expo Router entry + scripts**

In `package.json` set the entry and scripts:
```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Step 3: Add `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*))',
  ],
};
```

- [ ] **Step 4: Create `app.config.ts` with name, RTL, and env injection**

```ts
import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'כלב LOVE',
  slug: 'doglove',
  scheme: 'doglove',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: {
    package: 'com.doglove.app',
  },
  plugins: ['expo-router'],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  },
};

export default config;
```
Install dotenv for config loading:
```bash
npm install -D dotenv
```

- [ ] **Step 5: Create `.gitignore` and `.env.example`**

`.gitignore`:
```
node_modules/
.env
.expo/
dist/
web-build/
*.log
```
`.env.example`:
```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 6: Minimal root layout and index so the app boots**

`app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```
`app/index.tsx`:
```tsx
import { Text, View } from 'react-native';
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>כלב LOVE</Text>
    </View>
  );
}
```

- [ ] **Step 7: Write a smoke test**

`__tests__/smoke.test.ts`:
```ts
test('jest runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 8: Run the smoke test**

Run: `npm test -- __tests__/smoke.test.ts`
Expected: PASS (1 test passed).

- [ ] **Step 9: Verify the app boots on your phone**

Run: `npm start`
On your phone: open **Expo Go**, scan the QR code. Expected: a white screen showing "כלב LOVE". (This is the Slice 0 acceptance: app launches on the QA owner's phone.)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo TypeScript app with router, jest, env config"
```

---

## Task 2: Supabase project + `profiles` table with RLS

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`
- Modify: `.env` (local only, not committed)

**Interfaces:**
- Consumes: nothing in code
- Produces: a live Supabase project, a `profiles` table matching the spec, RLS policies, and a trigger that inserts a `profiles` row on new auth user. Provides `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Task 3.

- [ ] **Step 1: Create the Supabase project (manual)**

In the Supabase dashboard (https://supabase.com): create a new project. Note the **Project URL** and **anon public key** (Project Settings → API). Put them in a local `.env` (copy from `.env.example`). Do **not** commit `.env`.

- [ ] **Step 2: Write the migration SQL**

`supabase/migrations/0001_profiles.sql`:
```sql
-- profiles: one row per authenticated user
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  photo_url text,
  bio text,
  push_token text,
  is_discoverable boolean not null default true,
  auth_provider text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- a user can read their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- a user can update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- a user can insert their own profile row (fallback to trigger)
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- auto-create a profile row when a new auth user is created
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, auth_provider)
  values (new.id, new.raw_app_meta_data ->> 'provider')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 3: Apply the migration**

In the Supabase dashboard → SQL Editor: paste the contents of `0001_profiles.sql` and run it. Expected: "Success. No rows returned." Verify in Table Editor that `profiles` exists with RLS enabled (a shield icon).

- [ ] **Step 4: Enable Google OAuth (manual)**

In Supabase dashboard → Authentication → Providers → Google: enable it and paste a Google OAuth Client ID/secret (created in Google Cloud Console, with the Supabase callback URL as an authorized redirect URI). Also enable Email provider (on by default). Record that this is done.

- [ ] **Step 5: Commit the migration (no secrets)**

```bash
git add supabase/migrations/0001_profiles.sql
git commit -m "feat(db): add profiles table with RLS and new-user trigger"
```

---

## Task 3: Supabase client singleton

**Files:**
- Create: `src/lib/supabase.ts`
- Test: `__tests__/supabase.test.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_ANON_KEY` from `expo-constants` extra.
- Produces: `export const supabase` — a configured `SupabaseClient` used by all services.

- [ ] **Step 1: Write the failing test**

`__tests__/supabase.test.ts`:
```ts
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' } },
}));

test('exports a supabase client with auth', () => {
  const { supabase } = require('../src/lib/supabase');
  expect(supabase).toBeDefined();
  expect(supabase.auth).toBeDefined();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- __tests__/supabase.test.ts`
Expected: FAIL ("Cannot find module '../src/lib/supabase'").

- [ ] **Step 3: Implement the client**

`src/lib/supabase.ts`:
```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string }
  | undefined;

const supabaseUrl = extra?.supabaseUrl ?? '';
const supabaseAnonKey = extra?.supabaseAnonKey ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- __tests__/supabase.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts __tests__/supabase.test.ts
git commit -m "feat: add configured supabase client singleton"
```

---

## Task 4: Auth service

**Files:**
- Create: `src/services/auth.ts`
- Test: `__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`.
- Produces:
  - `signUpWithEmail(email: string, password: string): Promise<{ error: string | null }>`
  - `signInWithEmail(email: string, password: string): Promise<{ error: string | null }>`
  - `signInWithGoogle(): Promise<{ error: string | null }>`
  - `signOut(): Promise<void>`
  - `getSession(): Promise<Session | null>`
  - `onAuthStateChange(cb: (session: Session | null) => void): { unsubscribe: () => void }`
  (where `Session` is `@supabase/supabase-js`'s `Session`)

- [ ] **Step 1: Write the failing tests**

`__tests__/auth.test.ts`:
```ts
const mockAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signInWithOAuth: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
};
jest.mock('../src/lib/supabase', () => ({ supabase: { auth: mockAuth } }));

import * as auth from '../src/services/auth';

beforeEach(() => jest.clearAllMocks());

test('signUpWithEmail returns no error on success', async () => {
  mockAuth.signUp.mockResolvedValue({ error: null });
  const res = await auth.signUpWithEmail('a@b.com', 'pw123456');
  expect(mockAuth.signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw123456' });
  expect(res.error).toBeNull();
});

test('signInWithEmail surfaces an error message', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
  const res = await auth.signInWithEmail('a@b.com', 'wrong');
  expect(res.error).toBe('Invalid login credentials');
});

test('signInWithGoogle calls OAuth with google provider', async () => {
  mockAuth.signInWithOAuth.mockResolvedValue({ error: null });
  const res = await auth.signInWithGoogle();
  expect(mockAuth.signInWithOAuth.mock.calls[0][0].provider).toBe('google');
  expect(res.error).toBeNull();
});

test('getSession returns the session', async () => {
  mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
  const s = await auth.getSession();
  expect(s?.user.id).toBe('u1');
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test -- __tests__/auth.test.ts`
Expected: FAIL ("Cannot find module '../src/services/auth'").

- [ ] **Step 3: Implement the auth service**

`src/services/auth.ts`:
```ts
import { makeRedirectUri } from 'expo-auth-session';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export async function signUpWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signInWithGoogle() {
  const redirectTo = makeRedirectUri({ scheme: 'doglove' });
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthStateChange(cb: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return { unsubscribe: () => data.subscription.unsubscribe() };
}
```
Install the OAuth helper:
```bash
npx expo install expo-auth-session expo-web-browser
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test -- __tests__/auth.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/auth.ts __tests__/auth.test.ts package.json package-lock.json
git commit -m "feat(auth): add auth service for email and google sign-in"
```

---

## Task 5: Profile bootstrap helper

**Files:**
- Create: `src/services/profile.ts`
- Test: `__tests__/profile.test.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`.
- Produces: `ensureProfile(userId: string, provider?: string): Promise<{ error: string | null }>` — upserts a `profiles` row (id = userId) if it doesn't exist. This is a client-side safety net complementing the DB trigger from Task 2.

- [ ] **Step 1: Write the failing test**

`__tests__/profile.test.ts`:
```ts
const upsert = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ upsert })) },
}));
import { ensureProfile } from '../src/services/profile';

beforeEach(() => jest.clearAllMocks());

test('ensureProfile upserts the profile row by id', async () => {
  upsert.mockResolvedValue({ error: null });
  const res = await ensureProfile('user-1', 'google');
  expect(upsert).toHaveBeenCalledWith(
    { id: 'user-1', auth_provider: 'google' },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  expect(res.error).toBeNull();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- __tests__/profile.test.ts`
Expected: FAIL ("Cannot find module '../src/services/profile'").

- [ ] **Step 3: Implement the helper**

`src/services/profile.ts`:
```ts
import { supabase } from '../lib/supabase';

export async function ensureProfile(userId: string, provider?: string) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, auth_provider: provider }, { onConflict: 'id', ignoreDuplicates: true });
  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- __tests__/profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/profile.ts __tests__/profile.test.ts
git commit -m "feat(profile): add ensureProfile bootstrap helper"
```

---

## Task 6: Consent storage helpers

**Files:**
- Create: `src/state/consent.ts`
- Test: `__tests__/consent.test.ts`

**Interfaces:**
- Consumes: `@react-native-async-storage/async-storage`.
- Produces:
  - `hasSeenDataNotice(): Promise<boolean>`
  - `setDataNoticeSeen(): Promise<void>`

- [ ] **Step 1: Write the failing test**

`__tests__/consent.test.ts`:
```ts
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => { store[k] = v; return Promise.resolve(); }),
}));
import { hasSeenDataNotice, setDataNoticeSeen } from '../src/state/consent';

test('notice is unseen by default, seen after set', async () => {
  expect(await hasSeenDataNotice()).toBe(false);
  await setDataNoticeSeen();
  expect(await hasSeenDataNotice()).toBe(true);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- __tests__/consent.test.ts`
Expected: FAIL ("Cannot find module '../src/state/consent'").

- [ ] **Step 3: Implement the helpers**

`src/state/consent.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'doglove.dataNoticeSeen.v1';

export async function hasSeenDataNotice(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === 'true';
}

export async function setDataNoticeSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- __tests__/consent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/consent.ts __tests__/consent.test.ts
git commit -m "feat(privacy): add data-notice consent storage helpers"
```

---

## Task 7: Brand lockup component (כלב LOVE, RTL)

**Files:**
- Create: `src/components/BrandLockup.tsx`
- Test: `__tests__/BrandLockup.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<BrandLockup />` — renders "כלב" and "LOVE" with `testID="brand-lockup"`, Hebrew word on the right.

- [ ] **Step 1: Write the failing test**

`__tests__/BrandLockup.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import BrandLockup from '../src/components/BrandLockup';

test('renders both parts of the brand name', () => {
  const { getByText, getByTestId } = render(<BrandLockup />);
  expect(getByTestId('brand-lockup')).toBeTruthy();
  expect(getByText('כלב')).toBeTruthy();
  expect(getByText('LOVE')).toBeTruthy();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- __tests__/BrandLockup.test.tsx`
Expected: FAIL ("Cannot find module '../src/components/BrandLockup'").

- [ ] **Step 3: Implement the component**

`src/components/BrandLockup.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function BrandLockup() {
  // Row reversed so the Hebrew word sits on the right, LOVE on the left.
  return (
    <View testID="brand-lockup" style={styles.row}>
      <Text style={styles.love}>LOVE</Text>
      <Text style={styles.kelev}>כלב</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  kelev: { fontSize: 32, fontWeight: '800' },
  love: { fontSize: 32, fontWeight: '800', letterSpacing: 1 },
});
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- __tests__/BrandLockup.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BrandLockup.tsx __tests__/BrandLockup.test.tsx
git commit -m "feat(ui): add כלב LOVE brand lockup component"
```

---

## Task 8: Auth context + RTL root layout + routing

**Files:**
- Create: `src/state/AuthContext.tsx`
- Modify: `app/_layout.tsx`, `app/index.tsx`
- Test: `__tests__/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `getSession`, `onAuthStateChange`, `signOut` from `src/services/auth.ts`; `ensureProfile` from `src/services/profile.ts`.
- Produces: `AuthProvider` and `useAuth()` returning `{ session: Session | null, loading: boolean, signOut: () => Promise<void> }`. Root layout forces RTL and decides the route group.

- [ ] **Step 1: Write the failing test**

`__tests__/AuthContext.test.tsx`:
```tsx
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('../src/services/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: 'u1', app_metadata: { provider: 'email' } } }),
  onAuthStateChange: jest.fn(() => ({ unsubscribe: jest.fn() })),
  signOut: jest.fn(),
}));
jest.mock('../src/services/profile', () => ({ ensureProfile: jest.fn().mockResolvedValue({ error: null }) }));

import { AuthProvider, useAuth } from '../src/state/AuthContext';

function Probe() {
  const { session, loading } = useAuth();
  return <Text>{loading ? 'loading' : session ? 'in' : 'out'}</Text>;
}

test('loads session and exposes signed-in state', async () => {
  const { getByText } = render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(getByText('in')).toBeTruthy());
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- __tests__/AuthContext.test.tsx`
Expected: FAIL ("Cannot find module '../src/state/AuthContext'").

- [ ] **Step 3: Implement the context**

`src/state/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange, signOut as authSignOut } from '../services/auth';
import { ensureProfile } from '../services/profile';

type AuthValue = { session: Session | null; loading: boolean; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue>({ session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function apply(s: Session | null) {
      if (!active) return;
      setSession(s);
      if (s?.user) await ensureProfile(s.user.id, (s.user.app_metadata as any)?.provider);
      setLoading(false);
    }
    getSession().then(apply);
    const sub = onAuthStateChange(apply);
    return () => { active = false; sub.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, signOut: authSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- __tests__/AuthContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Force RTL and wrap the app in the root layout**

`app/_layout.tsx`:
```tsx
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/state/AuthContext';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
```

- [ ] **Step 6: Route the index by consent + auth state**

`app/index.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/state/AuthContext';
import { hasSeenDataNotice } from '../src/state/consent';

export default function Index() {
  const { session, loading } = useAuth();
  const [noticeSeen, setNoticeSeen] = useState<boolean | null>(null);

  useEffect(() => { hasSeenDataNotice().then(setNoticeSeen); }, []);

  if (loading || noticeSeen === null) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  if (!noticeSeen) return <Redirect href="/notice" />;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)/home" />;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/state/AuthContext.tsx app/_layout.tsx app/index.tsx __tests__/AuthContext.test.tsx
git commit -m "feat(auth): add auth context, RTL root layout, and routing"
```

---

## Task 9: Data-exposure notice screen

**Files:**
- Create: `app/notice.tsx`

**Interfaces:**
- Consumes: `setDataNoticeSeen` from `src/state/consent.ts`; `BrandLockup`.
- Produces: a first-run screen; pressing "I understand" persists consent and routes to login.

- [ ] **Step 1: Implement the notice screen**

`app/notice.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import BrandLockup from '../src/components/BrandLockup';
import { setDataNoticeSeen } from '../src/state/consent';

export default function Notice() {
  const router = useRouter();
  async function accept() {
    await setDataNoticeSeen();
    router.replace('/(auth)/login');
  }
  return (
    <View style={styles.container}>
      <BrandLockup />
      <Text style={styles.title}>איך אנחנו שומרים על הפרטיות שלך</Text>
      <Text style={styles.body}>
        • החשבון והפרופיל שלך משמשים לחיבור עם בעלי כלבים אחרים.{'\n'}
        • המיקום שלך משותף רק כשאתה בהליכה פעילה — וברגע שתסיים, הוא מפסיק.{'\n'}
        • לעולם לא נעקוב אחריך ברקע.{'\n'}
        • תוכל למחוק את החשבון והנתונים בכל עת.
      </Text>
      <Pressable testID="accept-notice" style={styles.btn} onPress={accept}>
        <Text style={styles.btnText}>הבנתי, בוא נתחיל</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 20 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'right' },
  body: { fontSize: 16, lineHeight: 26, textAlign: 'right' },
  btn: { backgroundColor: '#e0364f', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify on device**

Run: `npm start`, reload the app (fresh install or clear storage). Expected: the data-exposure notice appears first; tapping "הבנתי, בוא נתחיל" advances to the login screen (built next; until Task 10 it may 404 — that's fine, verify the notice itself renders and the button persists consent).

- [ ] **Step 3: Commit**

```bash
git add app/notice.tsx
git commit -m "feat(privacy): add first-run data-exposure notice screen"
```

---

## Task 10: Login and sign-up screens

**Files:**
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`

**Interfaces:**
- Consumes: `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle` from `src/services/auth.ts`; `BrandLockup`.
- Produces: working auth screens. On success, the auth state change (Task 8) re-routes to home automatically.

- [ ] **Step 1: Add the auth group layout**

`app/(auth)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Implement the login screen**

`app/(auth)/login.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Link } from 'expo-router';
import BrandLockup from '../../src/components/BrandLockup';
import { signInWithEmail, signInWithGoogle } from '../../src/services/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onEmailLogin() {
    setBusy(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (error) Alert.alert('שגיאת התחברות', error);
  }
  async function onGoogle() {
    const { error } = await signInWithGoogle();
    if (error) Alert.alert('שגיאת התחברות', error);
  }

  return (
    <View style={styles.c}>
      <BrandLockup />
      <Pressable testID="google-btn" style={[styles.btn, styles.google]} onPress={onGoogle}>
        <Text style={styles.googleText}>התחבר עם Google</Text>
      </Pressable>
      <Text style={styles.or}>או</Text>
      <TextInput style={styles.input} placeholder="אימייל" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="סיסמה" secureTextEntry
        value={password} onChangeText={setPassword} />
      <Pressable testID="login-btn" disabled={busy} style={styles.btn} onPress={onEmailLogin}>
        <Text style={styles.btnText}>{busy ? '...' : 'התחבר'}</Text>
      </Pressable>
      <Link href="/(auth)/signup" style={styles.link}>אין לך חשבון? הרשם</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, fontSize: 16, textAlign: 'right' },
  btn: { backgroundColor: '#e0364f', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
  google: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  googleText: { color: '#333', fontSize: 16, fontWeight: '700' },
  or: { textAlign: 'center', color: '#888' },
  link: { textAlign: 'center', color: '#e0364f', marginTop: 8 },
});
```

- [ ] **Step 3: Implement the sign-up screen**

`app/(auth)/signup.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signUpWithEmail } from '../../src/services/auth';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSignup() {
    if (password.length < 6) { Alert.alert('סיסמה קצרה מדי', 'לפחות 6 תווים'); return; }
    setBusy(true);
    const { error } = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (error) { Alert.alert('הרשמה נכשלה', error); return; }
    Alert.alert('כמעט סיימנו', 'בדוק את האימייל לאישור, ואז התחבר.');
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.c}>
      <Text style={styles.title}>יצירת חשבון</Text>
      <TextInput style={styles.input} placeholder="אימייל" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="סיסמה (6+ תווים)" secureTextEntry
        value={password} onChangeText={setPassword} />
      <Pressable testID="signup-btn" disabled={busy} style={styles.btn} onPress={onSignup}>
        <Text style={styles.btnText}>{busy ? '...' : 'הרשם'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, fontSize: 16, textAlign: 'right' },
  btn: { backgroundColor: '#e0364f', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
});
```

- [ ] **Step 4: Verify on device**

Run: `npm start`. Expected: from the notice → login screen with a Google button, email/password fields, and a sign-up link. Create an email account, confirm via email, log in. Check the Supabase dashboard: a row appears in `auth.users` and a matching row in `profiles`.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)"
git commit -m "feat(auth): add login and sign-up screens"
```

---

## Task 11: Placeholder Home screen with sign-out

**Files:**
- Create: `app/(app)/_layout.tsx`, `app/(app)/home.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `src/state/AuthContext.tsx`; `BrandLockup`.
- Produces: the post-login landing screen. Signing out re-routes to login via auth state change.

- [ ] **Step 1: Add the app group layout**

`app/(app)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Implement the home placeholder**

`app/(app)/home.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import BrandLockup from '../../src/components/BrandLockup';
import { useAuth } from '../../src/state/AuthContext';

export default function Home() {
  const { session, signOut } = useAuth();
  return (
    <View style={styles.c}>
      <BrandLockup />
      <Text style={styles.hello}>ברוך הבא! 🐶</Text>
      <Text style={styles.sub}>{session?.user.email ?? 'מחובר עם Google'}</Text>
      <Text style={styles.note}>המפה החיה תגיע בשלב הבא.</Text>
      <Pressable testID="signout-btn" style={styles.btn} onPress={signOut}>
        <Text style={styles.btnText}>התנתק</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 16 },
  hello: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 16, color: '#555' },
  note: { fontSize: 14, color: '#999' },
  btn: { backgroundColor: '#333', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginTop: 12 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 3: Full end-to-end verification on device**

Run: `npm start`. Walk the whole flow on your phone:
1. Fresh app → data-exposure notice → accept.
2. Login screen → sign in (email or Google).
3. Land on Home showing your email / Google.
4. Tap "התנתק" → returns to login.
5. Kill and reopen the app → still logged out (or logged in if you didn't sign out) — session persists.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass (smoke, supabase, auth, profile, consent, BrandLockup, AuthContext).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)"
git commit -m "feat: add placeholder home screen with sign-out; complete auth flow"
```

---

## Self-Review (completed)

**Spec coverage (Slices 0–1):**
- Slice 0 Setup → Task 1 (Expo app boots on phone, RTL, branding shell). ✓
- Slice 1 Auth: Google sign-in → Tasks 4, 10. Email sign-up/login/logout → Tasks 4, 10, 11. Wrong-password error → Task 10 (Alert). Session persistence → Task 3 (AsyncStorage) + Task 11 verify. First-run data-exposure notice → Tasks 6, 9. Auto `profiles` row → Task 2 (trigger) + Task 5 (client fallback). ✓
- FR-1.1–1.6, FR-6.1 covered. RLS (NFR-4) → Task 2. RTL branding → Tasks 4, 7, 8. ✓

**Out of scope for this plan (later plans):** map, walk sessions, matchmaking, chat, privacy center, photos — Plans 02–07.

**Placeholder scan:** No TBD/TODO; every code step has full code. ✓

**Type consistency:** `signInWithEmail/Email/Google`, `getSession`, `onAuthStateChange`, `ensureProfile(userId, provider)`, `useAuth()` returning `{ session, loading, signOut }`, consent `hasSeenDataNotice/setDataNoticeSeen` — names match across tasks. ✓

**Known manual/external steps (not code, can't be unit-tested):** Supabase project creation, Google OAuth credential setup, email-confirmation step. Flagged in Task 2 and Task 10.
