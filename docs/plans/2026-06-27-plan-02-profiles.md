# כלב LOVE — Plan 02: Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in owner complete their own profile (name, photo, date of birth, gender, bio) and manage one or more dog profiles (name, type/breed, age, size, required photo, optional description), with photos stored in Supabase Storage — and replace the placeholder Home with a real profile screen. Enforce the 18+ rule **server-side** (the carry-forward from Plan 01).

**Architecture:** Continues the Plan 01 stack: React Native + Expo (SDK 54, TypeScript) talking directly to Supabase. New DB migration adds owner fields + the `dogs` table + Storage buckets + a server-side age-gate trigger, all under Row-Level Security. A thin, unit-tested service layer (`profile.ts` extended, new `dogs.ts`, new `storage.ts`) wraps Supabase; screens are dumb and call services. UI follows the existing "Golden-Hour Dog Park" design system in `src/theme.ts`.

**Tech Stack:** Expo SDK 54, TypeScript, `@supabase/supabase-js`, Supabase Storage, `expo-image-picker`, `@react-native-community/datetimepicker` (already installed), Expo Router, Jest + `@testing-library/react-native`.

## Global Constraints

- App name **כלב LOVE** (Hebrew **כלב** right, **LOVE** left). RTL is first-class — all new screens render right-to-left.
- TypeScript everywhere. Tests use Jest (jest-expo) + `@testing-library/react-native`. Keep the suite green; run `npm test` before each commit.
- **Owner profile fields:** `display_name` (required), `photo_url` (required), `date_of_birth` (required), `gender` (required, one of `male`/`female`/`other`/`prefer_not_to_say`), `bio` (optional). `age` is **derived from `date_of_birth`**, never stored (avoids staleness).
- **Dog fields:** `name`, `breed` (the "type"), `age`, `photo_url` are **required**; `size` (`S`/`M`/`L`) and `bio` (description) are **optional**.
- **18+ rule:** enforced **server-side** — a Postgres trigger rejects a `profiles` row whose `date_of_birth` implies age < 18 (backs the client gate from Plan 01).
- **RLS on every table.** A user reads/writes only their own profile and their own dogs. Dog photos and dog rows are world-readable (needed later for the map/matchmaking); owner private fields stay owner-only.
- Secrets via Expo env (`.env` git-ignored). Use the existing `supabase` client singleton (`src/lib/supabase.ts`).
- Follow the design tokens in `src/theme.ts` (colors, font, radius, shadow) and reuse `DogParkBackground` + `BrandLockup`.
- Dog-park copy is Hebrew. Code/identifiers in English.

**Repo root:** `C:\Apps\DogLove` (git repo, branch from `master`). All paths below are under this root.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0002_profiles_dogs_storage.sql` | ALTER `profiles` (+date_of_birth, +gender); create `dogs` table + RLS; create Storage buckets + policies; server-side 18+ trigger |
| `src/types/profile.ts` | Shared TS types: `Gender`, `DogSize`, `OwnerProfile`, `Dog`, `GENDER_OPTIONS`, `SIZE_OPTIONS` |
| `src/services/profile.ts` | Extend: `getMyProfile`, `saveMyProfile` (alongside existing `ensureProfile`) |
| `src/services/dogs.ts` | `listMyDogs`, `createDog`, `updateDog`, `deleteDog` |
| `src/services/storage.ts` | `uploadImage(bucket, userId, uri)` → public URL |
| `src/lib/pickImage.ts` | Wrap `expo-image-picker`: request permission + pick a square image, return uri |
| `src/lib/age.ts` | Extend: add `ageFromISO(birthISO, now)` helper (reuses the boundary math) |
| `src/components/Avatar.tsx` | Round image/initials avatar used across profile screens |
| `src/components/FormField.tsx` | Labeled RTL input row (DRY for the forms) |
| `app/(app)/home.tsx` | Replace placeholder with the real profile screen (owner card + dogs list) |
| `app/(app)/edit-profile.tsx` | Owner profile form |
| `app/(app)/dog/[id].tsx` | Dog create/edit form (`id` = `new` or a dog id) |
| `__tests__/profileService.test.ts` | Tests for `getMyProfile` / `saveMyProfile` |
| `__tests__/dogs.test.ts` | Tests for dogs CRUD service |
| `__tests__/storage.test.ts` | Tests for `uploadImage` |
| `__tests__/ageFromISO.test.ts` | Tests for `ageFromISO` |

---

## Task 1: DB migration — owner fields, dogs table, storage, 18+ trigger

**Files:**
- Create: `supabase/migrations/0002_profiles_dogs_storage.sql`

**Interfaces:**
- Consumes: the `profiles` table from Plan 01 migration `0001`.
- Produces: `profiles.date_of_birth`, `profiles.gender`; the `dogs` table; Storage buckets `avatars` and `dog-photos` with policies; a `profiles` BEFORE INSERT/UPDATE trigger enforcing age ≥ 18.

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/0002_profiles_dogs_storage.sql`:
```sql
-- 1. Owner profile: add date_of_birth + gender (age is derived, not stored)
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists gender text;

-- 2. Server-side 18+ enforcement (backs the client gate from Plan 01)
create or replace function public.enforce_adult_profile()
returns trigger language plpgsql as $$
begin
  if new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '18 years') then
    raise exception 'Owner must be at least 18 years old';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_adult_profile on public.profiles;
create trigger trg_enforce_adult_profile
  before insert or update on public.profiles
  for each row execute function public.enforce_adult_profile();

-- 3. dogs table
create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  breed text not null,        -- the dog's "type"
  age int not null,
  size text,                  -- 'S' | 'M' | 'L' (optional)
  photo_url text not null,
  bio text,                   -- description (optional)
  created_at timestamptz not null default now()
);

create index if not exists dogs_owner_id_idx on public.dogs (owner_id);
create index if not exists dogs_breed_idx on public.dogs (breed);

alter table public.dogs enable row level security;

-- Dogs are world-readable (map/matchmaking later); writes are owner-only.
drop policy if exists "dogs_select_all" on public.dogs;
create policy "dogs_select_all" on public.dogs for select using (true);

drop policy if exists "dogs_insert_own" on public.dogs;
create policy "dogs_insert_own" on public.dogs for insert
  with check (auth.uid() = owner_id);

drop policy if exists "dogs_update_own" on public.dogs;
create policy "dogs_update_own" on public.dogs for update
  using (auth.uid() = owner_id);

drop policy if exists "dogs_delete_own" on public.dogs;
create policy "dogs_delete_own" on public.dogs for delete
  using (auth.uid() = owner_id);

-- 4. Storage buckets for photos (public read)
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('dog-photos', 'dog-photos', true)
  on conflict (id) do nothing;

-- Storage policies: anyone can read; a user may write only inside a folder
-- named after their own uid (path = "<uid>/<file>").
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects for select
  using (bucket_id in ('avatars', 'dog-photos'));

drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own" on storage.objects for insert
  with check (
    bucket_id in ('avatars', 'dog-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update
  using (
    bucket_id in ('avatars', 'dog-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Apply the migration (manual, Supabase dashboard)**

In Supabase → SQL Editor → paste the file contents → Run. Expected: "Success. No rows returned." Verify in Table Editor that `dogs` exists (RLS on) and `profiles` has `date_of_birth` + `gender`; in Storage that `avatars` and `dog-photos` buckets exist.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_profiles_dogs_storage.sql
git commit -m "feat(db): owner fields, dogs table, storage buckets, server-side 18+ trigger"
```

---

## Task 2: Shared profile/dog types

**Files:**
- Create: `src/types/profile.ts`

**Interfaces:**
- Produces:
  - `type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'`
  - `type DogSize = 'S' | 'M' | 'L'`
  - `interface OwnerProfile { id: string; display_name: string | null; photo_url: string | null; date_of_birth: string | null; gender: Gender | null; bio: string | null }`
  - `interface Dog { id: string; owner_id: string; name: string; breed: string; age: number; size: DogSize | null; photo_url: string; bio: string | null }`
  - `GENDER_OPTIONS: { value: Gender; label: string }[]`, `SIZE_OPTIONS: { value: DogSize; label: string }[]`

- [ ] **Step 1: Create the types file**

`src/types/profile.ts`:
```ts
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type DogSize = 'S' | 'M' | 'L';

export interface OwnerProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  date_of_birth: string | null; // ISO YYYY-MM-DD
  gender: Gender | null;
  bio: string | null;
}

export interface Dog {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  age: number;
  size: DogSize | null;
  photo_url: string;
  bio: string | null;
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'נקבה' },
  { value: 'male', label: 'זכר' },
  { value: 'other', label: 'אחר' },
  { value: 'prefer_not_to_say', label: 'מעדיף/ה לא לומר' },
];

export const SIZE_OPTIONS: { value: DogSize; label: string }[] = [
  { value: 'S', label: 'קטן' },
  { value: 'M', label: 'בינוני' },
  { value: 'L', label: 'גדול' },
];
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/profile.ts
git commit -m "feat(types): add owner profile and dog types"
```

---

## Task 3: `ageFromISO` helper

**Files:**
- Modify: `src/lib/age.ts`
- Test: `__tests__/ageFromISO.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ageFromISO(birthISO: string, now: Date): number` — whole years; returns `0` for empty/invalid input. (The existing `isAdult` stays unchanged.)

- [ ] **Step 1: Write the failing test**

`__tests__/ageFromISO.test.ts`:
```ts
import { ageFromISO } from '../src/lib/age';

const now = new Date('2026-06-27T00:00:00Z');

test('computes whole years, true on the birthday', () => {
  expect(ageFromISO('2008-06-27', now)).toBe(18);
  expect(ageFromISO('2008-06-28', now)).toBe(17);
  expect(ageFromISO('2000-01-01', now)).toBe(26);
});

test('returns 0 for empty or invalid input', () => {
  expect(ageFromISO('', now)).toBe(0);
  expect(ageFromISO('not-a-date', now)).toBe(0);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest __tests__/ageFromISO.test.ts`
Expected: FAIL ("ageFromISO is not a function").

- [ ] **Step 3: Implement the helper (append to `src/lib/age.ts`)**

Add to `src/lib/age.ts`:
```ts
export function ageFromISO(birthISO: string, now: Date): number {
  if (!birthISO) return 0;
  const birth = new Date(birthISO);
  if (isNaN(birth.getTime())) return 0;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age < 0 ? 0 : age;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx jest __tests__/ageFromISO.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/age.ts __tests__/ageFromISO.test.ts
git commit -m "feat(age): add ageFromISO helper"
```

---

## Task 4: Profile service — get + save

**Files:**
- Modify: `src/services/profile.ts`
- Test: `__tests__/profileService.test.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`; `OwnerProfile` from `src/types/profile.ts`.
- Produces:
  - `getMyProfile(userId: string): Promise<{ data: OwnerProfile | null; error: string | null }>`
  - `saveMyProfile(userId: string, patch: Partial<OwnerProfile>): Promise<{ error: string | null }>`
  (the existing `ensureProfile` stays.)

- [ ] **Step 1: Write the failing tests**

`__tests__/profileService.test.ts`:
```ts
const single = jest.fn();
const eq = jest.fn(() => ({ single }));
const select = jest.fn(() => ({ eq }));
const upsert = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ select, upsert })) },
}));
import { getMyProfile, saveMyProfile } from '../src/services/profile';

beforeEach(() => jest.clearAllMocks());

test('getMyProfile returns the row', async () => {
  single.mockResolvedValue({ data: { id: 'u1', display_name: 'Maya' }, error: null });
  const res = await getMyProfile('u1');
  expect(eq).toHaveBeenCalledWith('id', 'u1');
  expect(res.data?.display_name).toBe('Maya');
  expect(res.error).toBeNull();
});

test('saveMyProfile upserts the patch with the id', async () => {
  upsert.mockResolvedValue({ error: null });
  const res = await saveMyProfile('u1', { display_name: 'Maya', gender: 'female' });
  expect(upsert).toHaveBeenCalledWith(
    { id: 'u1', display_name: 'Maya', gender: 'female' },
    { onConflict: 'id' },
  );
  expect(res.error).toBeNull();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest __tests__/profileService.test.ts`
Expected: FAIL ("getMyProfile is not a function").

- [ ] **Step 3: Implement (append to `src/services/profile.ts`)**

Add these imports/functions to `src/services/profile.ts` (keep the existing `ensureProfile`):
```ts
import type { OwnerProfile } from '../types/profile';

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url, date_of_birth, gender, bio')
    .eq('id', userId)
    .single();
  return { data: (data as OwnerProfile) ?? null, error: error?.message ?? null };
}

export async function saveMyProfile(userId: string, patch: Partial<OwnerProfile>) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch }, { onConflict: 'id' });
  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx jest __tests__/profileService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/profile.ts __tests__/profileService.test.ts
git commit -m "feat(profile): add getMyProfile and saveMyProfile"
```

---

## Task 5: Dogs service — CRUD

**Files:**
- Create: `src/services/dogs.ts`
- Test: `__tests__/dogs.test.ts`

**Interfaces:**
- Consumes: `supabase`; `Dog` from `src/types/profile.ts`.
- Produces:
  - `listMyDogs(ownerId: string): Promise<{ data: Dog[]; error: string | null }>`
  - `createDog(ownerId: string, dog: Omit<Dog, 'id' | 'owner_id'>): Promise<{ error: string | null }>`
  - `updateDog(id: string, patch: Partial<Dog>): Promise<{ error: string | null }>`
  - `deleteDog(id: string): Promise<{ error: string | null }>`

- [ ] **Step 1: Write the failing tests**

`__tests__/dogs.test.ts`:
```ts
const order = jest.fn();
const eqSel = jest.fn(() => ({ order }));
const select = jest.fn(() => ({ eq: eqSel }));
const insert = jest.fn();
const eqUpd = jest.fn();
const update = jest.fn(() => ({ eq: eqUpd }));
const eqDel = jest.fn();
const del = jest.fn(() => ({ eq: eqDel }));
jest.mock('../src/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ select, insert, update, delete: del })) },
}));
import { listMyDogs, createDog, updateDog, deleteDog } from '../src/services/dogs';

beforeEach(() => jest.clearAllMocks());

test('listMyDogs filters by owner and returns rows', async () => {
  order.mockResolvedValue({ data: [{ id: 'd1', name: 'Rocky' }], error: null });
  const res = await listMyDogs('u1');
  expect(eqSel).toHaveBeenCalledWith('owner_id', 'u1');
  expect(res.data).toHaveLength(1);
  expect(res.error).toBeNull();
});

test('createDog inserts with the owner id', async () => {
  insert.mockResolvedValue({ error: null });
  const res = await createDog('u1', { name: 'Rocky', breed: 'Lab', age: 3, size: 'L', photo_url: 'u', bio: null });
  expect(insert).toHaveBeenCalledWith({
    owner_id: 'u1', name: 'Rocky', breed: 'Lab', age: 3, size: 'L', photo_url: 'u', bio: null,
  });
  expect(res.error).toBeNull();
});

test('updateDog updates by id', async () => {
  eqUpd.mockResolvedValue({ error: null });
  const res = await updateDog('d1', { name: 'Rex' });
  expect(update).toHaveBeenCalledWith({ name: 'Rex' });
  expect(eqUpd).toHaveBeenCalledWith('id', 'd1');
  expect(res.error).toBeNull();
});

test('deleteDog deletes by id', async () => {
  eqDel.mockResolvedValue({ error: null });
  const res = await deleteDog('d1');
  expect(eqDel).toHaveBeenCalledWith('id', 'd1');
  expect(res.error).toBeNull();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest __tests__/dogs.test.ts`
Expected: FAIL ("Cannot find module '../src/services/dogs'").

- [ ] **Step 3: Implement the service**

`src/services/dogs.ts`:
```ts
import { supabase } from '../lib/supabase';
import type { Dog } from '../types/profile';

const COLUMNS = 'id, owner_id, name, breed, age, size, photo_url, bio';

export async function listMyDogs(ownerId: string) {
  const { data, error } = await supabase
    .from('dogs')
    .select(COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  return { data: (data as Dog[]) ?? [], error: error?.message ?? null };
}

export async function createDog(ownerId: string, dog: Omit<Dog, 'id' | 'owner_id'>) {
  const { error } = await supabase.from('dogs').insert({ owner_id: ownerId, ...dog });
  return { error: error?.message ?? null };
}

export async function updateDog(id: string, patch: Partial<Dog>) {
  const { error } = await supabase.from('dogs').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteDog(id: string) {
  const { error } = await supabase.from('dogs').delete().eq('id', id);
  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx jest __tests__/dogs.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/dogs.ts __tests__/dogs.test.ts
git commit -m "feat(dogs): add dogs CRUD service"
```

---

## Task 6: Image upload service

**Files:**
- Create: `src/services/storage.ts`
- Test: `__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `supabase` (its `.storage`).
- Produces: `uploadImage(bucket: 'avatars' | 'dog-photos', userId: string, uri: string): Promise<{ url: string | null; error: string | null }>` — uploads the local image to `"<userId>/<timestamp>.jpg"` and returns its public URL. (The caller passes a unique-enough filename via the current time; in tests the time is injected as the 4th arg `now` for determinism.)

- [ ] **Step 1: Write the failing test**

`__tests__/storage.test.ts`:
```ts
const upload = jest.fn();
const getPublicUrl = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  supabase: { storage: { from: jest.fn(() => ({ upload, getPublicUrl })) } },
}));
import { uploadImage } from '../src/services/storage';

beforeEach(() => {
  jest.clearAllMocks();
  // @ts-ignore
  global.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
});

test('uploads to <userId>/<now>.jpg and returns public url', async () => {
  upload.mockResolvedValue({ error: null });
  getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn/avatars/u1/123.jpg' } });
  const res = await uploadImage('avatars', 'u1', 'file:///tmp/pic.jpg', 123);
  expect(global.fetch).toHaveBeenCalledWith('file:///tmp/pic.jpg');
  expect(upload).toHaveBeenCalledWith('u1/123.jpg', expect.any(ArrayBuffer), {
    contentType: 'image/jpeg', upsert: true,
  });
  expect(res.url).toBe('https://cdn/avatars/u1/123.jpg');
  expect(res.error).toBeNull();
});

test('returns the error when upload fails', async () => {
  upload.mockResolvedValue({ error: { message: 'denied' } });
  const res = await uploadImage('avatars', 'u1', 'file:///tmp/pic.jpg', 123);
  expect(res.url).toBeNull();
  expect(res.error).toBe('denied');
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest __tests__/storage.test.ts`
Expected: FAIL ("Cannot find module '../src/services/storage'").

- [ ] **Step 3: Implement the service**

`src/services/storage.ts`:
```ts
import { supabase } from '../lib/supabase';

type Bucket = 'avatars' | 'dog-photos';

// `now` is injectable so tests are deterministic; production callers omit it.
export async function uploadImage(bucket: Bucket, userId: string, uri: string, now = Date.now()) {
  const path = `${userId}/${now}.jpg`;
  const arrayBuffer = await fetch(uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx jest __tests__/storage.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/storage.ts __tests__/storage.test.ts
git commit -m "feat(storage): add image upload service"
```

---

## Task 7: Image picker helper

**Files:**
- Create: `src/lib/pickImage.ts`

**Interfaces:**
- Consumes: `expo-image-picker`.
- Produces: `pickSquareImage(): Promise<string | null>` — requests library permission, opens the picker (1:1 crop), returns the selected local uri or `null` if cancelled/denied.

- [ ] **Step 1: Install expo-image-picker**

Run: `npx expo install expo-image-picker`
Then add its config plugin to `app.config.ts` `plugins` array: `'expo-image-picker'` (alongside the existing plugins).

- [ ] **Step 2: Implement the helper**

`src/lib/pickImage.ts`:
```ts
import * as ImagePicker from 'expo-image-picker';

export async function pickSquareImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pickImage.ts app.config.ts package.json package-lock.json
git commit -m "feat: add image picker helper"
```

---

## Task 8: Reusable UI — Avatar + FormField

**Files:**
- Create: `src/components/Avatar.tsx`, `src/components/FormField.tsx`

**Interfaces:**
- Produces:
  - `<Avatar uri={string | null} fallback={string} size={number} />` — round image, or coral circle with the fallback's first letter when `uri` is null.
  - `<FormField label={string}>{children}</FormField>` — RTL labeled row wrapping any input.

- [ ] **Step 1: Implement Avatar**

`src/components/Avatar.tsx`:
```tsx
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

export default function Avatar({ uri, fallback = '🐶', size = 96 }: { uri: string | null; fallback?: string; size?: number }) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.img, dim]} />;
  return (
    <View style={[styles.fallback, dim]}>
      <Text style={{ fontSize: size * 0.4 }}>{fallback}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { borderWidth: 3, borderColor: colors.white, backgroundColor: colors.coralSoft },
  fallback: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.coralSoft, borderWidth: 3, borderColor: colors.white,
  },
});
```

- [ ] **Step 2: Implement FormField**

`src/components/FormField.tsx`:
```tsx
import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

export default function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  label: { fontFamily: font.medium, fontSize: 13, color: colors.caramel, textAlign: 'right' },
});
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Avatar.tsx src/components/FormField.tsx
git commit -m "feat(ui): add Avatar and FormField components"
```

---

## Task 9: Owner profile edit screen

**Files:**
- Create: `app/(app)/edit-profile.tsx`

**Interfaces:**
- Consumes: `useAuth()`; `getMyProfile`/`saveMyProfile`; `uploadImage`; `pickSquareImage`; `isAdult`; `GENDER_OPTIONS`; `Avatar`, `FormField`, `DogParkBackground`; theme.
- Produces: a screen at route `/(app)/edit-profile` that loads the owner's profile, lets them edit name, photo, DOB (date picker), gender (chips), bio, and saves. Blocks save if under 18 (client) — the server trigger backs it.

- [ ] **Step 1: Implement the screen**

`app/(app)/edit-profile.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DogParkBackground from '../../src/components/DogParkBackground';
import Avatar from '../../src/components/Avatar';
import FormField from '../../src/components/FormField';
import { useAuth } from '../../src/state/AuthContext';
import { getMyProfile, saveMyProfile } from '../../src/services/profile';
import { uploadImage } from '../../src/services/storage';
import { pickSquareImage } from '../../src/lib/pickImage';
import { isAdult } from '../../src/lib/age';
import { GENDER_OPTIONS, Gender } from '../../src/types/profile';
import { colors, font, radius, shadow } from '../../src/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const toDisplay = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`; };
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function EditProfile() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [bio, setBio] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyProfile(userId).then(({ data }) => {
      if (!data) return;
      setName(data.display_name ?? '');
      setPhoto(data.photo_url);
      setDob(data.date_of_birth);
      setGender(data.gender);
      setBio(data.bio ?? '');
    });
  }, [userId]);

  async function onPickPhoto() {
    const uri = await pickSquareImage();
    if (uri) setPhoto(uri);
  }

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDob(toISO(selected));
  }

  async function onSave() {
    if (!name.trim()) { Alert.alert('שדה חסר', 'יש להזין שם'); return; }
    if (!dob) { Alert.alert('שדה חסר', 'יש לבחור תאריך לידה'); return; }
    const now = new Date();
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (!isAdult(dob, utcToday)) { Alert.alert('הרשמה נכשלה', 'עליך להיות בן 18 ומעלה'); return; }
    if (!gender) { Alert.alert('שדה חסר', 'יש לבחור מגדר'); return; }
    if (!photo) { Alert.alert('שדה חסר', 'יש להוסיף תמונת פרופיל'); return; }

    setBusy(true);
    let photoUrl = photo;
    if (photo.startsWith('file:')) {
      const up = await uploadImage('avatars', userId, photo);
      if (up.error) { setBusy(false); Alert.alert('שגיאת העלאה', up.error); return; }
      photoUrl = up.url!;
    }
    const { error } = await saveMyProfile(userId, {
      display_name: name.trim(), photo_url: photoUrl, date_of_birth: dob, gender, bio: bio.trim() || null,
    });
    setBusy(false);
    if (error) { Alert.alert('שמירה נכשלה', error); return; }
    router.replace('/(app)/home');
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>הפרופיל שלי</Text>

          <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
            <Avatar uri={photo} fallback="🧑" size={110} />
            <Text style={styles.changePhoto}>החלף תמונה 📷</Text>
          </Pressable>

          <View style={[styles.card, shadow.card]}>
            <FormField label="שם">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="השם שלך" placeholderTextColor={colors.inkSoft} />
            </FormField>

            <FormField label="תאריך לידה">
              <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
                <Text style={[styles.inputText, !dob && { color: colors.inkSoft }]}>
                  {dob ? toDisplay(dob) : 'בחר תאריך'}
                </Text>
              </Pressable>
            </FormField>
            {showPicker && (
              <DateTimePicker
                value={dob ? new Date(dob) : new Date(1995, 0, 1)}
                mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                maximumDate={new Date()} onChange={onDateChange}
              />
            )}

            <FormField label="מגדר">
              <View style={styles.chips}>
                {GENDER_OPTIONS.map((g) => (
                  <Pressable key={g.value} onPress={() => setGender(g.value)}
                    style={[styles.chip, gender === g.value && styles.chipOn]}>
                    <Text style={[styles.chipText, gender === g.value && styles.chipTextOn]}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>
            </FormField>

            <FormField label="קצת עליי (אופציונלי)">
              <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio}
                placeholder="ספר/י קצת..." placeholderTextColor={colors.inkSoft} multiline />
            </FormField>
          </View>

          <Pressable testID="save-profile" disabled={busy} onPress={onSave}
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{busy ? 'שומר…' : 'שמירה 🐾'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 16 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.bark, textAlign: 'center' },
  avatarWrap: { alignItems: 'center', gap: 8 },
  changePhoto: { fontFamily: font.medium, color: colors.coralDeep, fontSize: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.line },
  input: {
    backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: font.regular, color: colors.ink,
    textAlign: 'right', writingDirection: 'rtl',
  },
  inputText: { fontFamily: font.regular, fontSize: 16, color: colors.ink, textAlign: 'right' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/edit-profile.tsx"
git commit -m "feat(profile): add owner profile edit screen"
```

---

## Task 10: Dog create/edit screen

**Files:**
- Create: `app/(app)/dog/[id].tsx`

**Interfaces:**
- Consumes: `useAuth()`; `createDog`/`updateDog`/`deleteDog`/`listMyDogs`; `uploadImage`; `pickSquareImage`; `SIZE_OPTIONS`; `Avatar`, `FormField`, `DogParkBackground`; theme. Route param `id` (`'new'` or a dog id).
- Produces: a screen at `/(app)/dog/[id]` to create or edit a dog. Required: name, breed (type), age, photo. Optional: size, description.

- [ ] **Step 1: Implement the screen**

`app/(app)/dog/[id].tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DogParkBackground from '../../../src/components/DogParkBackground';
import Avatar from '../../../src/components/Avatar';
import FormField from '../../../src/components/FormField';
import { useAuth } from '../../../src/state/AuthContext';
import { listMyDogs, createDog, updateDog, deleteDog } from '../../../src/services/dogs';
import { uploadImage } from '../../../src/services/storage';
import { pickSquareImage } from '../../../src/lib/pickImage';
import { SIZE_OPTIONS, DogSize } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

export default function DogForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [size, setSize] = useState<DogSize | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    listMyDogs(userId).then(({ data }) => {
      const dog = data.find((d) => d.id === id);
      if (!dog) return;
      setName(dog.name); setBreed(dog.breed); setAge(String(dog.age));
      setSize(dog.size); setPhoto(dog.photo_url); setBio(dog.bio ?? '');
    });
  }, [id, isNew, userId]);

  async function onPickPhoto() {
    const uri = await pickSquareImage();
    if (uri) setPhoto(uri);
  }

  async function onSave() {
    if (!name.trim()) { Alert.alert('שדה חסר', 'יש להזין שם'); return; }
    if (!breed.trim()) { Alert.alert('שדה חסר', 'יש להזין סוג/גזע'); return; }
    const ageNum = parseInt(age, 10);
    if (!age.trim() || isNaN(ageNum) || ageNum < 0) { Alert.alert('גיל לא תקין', 'הזן גיל במספרים'); return; }
    if (!photo) { Alert.alert('שדה חסר', 'יש להוסיף תמונה של הכלב'); return; }

    setBusy(true);
    let photoUrl = photo;
    if (photo.startsWith('file:')) {
      const up = await uploadImage('dog-photos', userId, photo);
      if (up.error) { setBusy(false); Alert.alert('שגיאת העלאה', up.error); return; }
      photoUrl = up.url!;
    }
    const payload = { name: name.trim(), breed: breed.trim(), age: ageNum, size, photo_url: photoUrl, bio: bio.trim() || null };
    const { error } = isNew ? await createDog(userId, payload) : await updateDog(id, payload);
    setBusy(false);
    if (error) { Alert.alert('שמירה נכשלה', error); return; }
    router.replace('/(app)/home');
  }

  function onDelete() {
    Alert.alert('למחוק את הכלב?', 'הפעולה אינה הפיכה', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: async () => {
        await deleteDog(id); router.replace('/(app)/home');
      } },
    ]);
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isNew ? 'כלב חדש 🐕' : 'עריכת כלב 🐕'}</Text>

          <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
            <Avatar uri={photo} fallback="🐶" size={110} />
            <Text style={styles.changePhoto}>תמונת הכלב 📷</Text>
          </Pressable>

          <View style={[styles.card, shadow.card]}>
            <FormField label="שם">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="שם הכלב" placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label="סוג / גזע">
              <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="לדוגמה: לברדור" placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label="גיל (שנים)">
              <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="3" placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label="גודל (אופציונלי)">
              <View style={styles.chips}>
                {SIZE_OPTIONS.map((s) => (
                  <Pressable key={s.value} onPress={() => setSize(size === s.value ? null : s.value)}
                    style={[styles.chip, size === s.value && styles.chipOn]}>
                    <Text style={[styles.chipText, size === s.value && styles.chipTextOn]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </FormField>
            <FormField label="תיאור (אופציונלי)">
              <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} placeholder="האופי, הרגלים..." placeholderTextColor={colors.inkSoft} multiline />
            </FormField>
          </View>

          <Pressable testID="save-dog" disabled={busy} onPress={onSave}
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{busy ? 'שומר…' : 'שמירה 🐾'}</Text>
          </Pressable>

          {!isNew && (
            <Pressable onPress={onDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>מחיקת הכלב</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 16 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.bark, textAlign: 'center' },
  avatarWrap: { alignItems: 'center', gap: 8 },
  changePhoto: { fontFamily: font.medium, color: colors.coralDeep, fontSize: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.line },
  input: {
    backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: font.regular, color: colors.ink,
    textAlign: 'right', writingDirection: 'rtl',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { fontFamily: font.medium, color: colors.danger, fontSize: 15 },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/dog"
git commit -m "feat(dogs): add dog create/edit screen"
```

---

## Task 11: Real Home — profile + dogs list

**Files:**
- Modify: `app/(app)/home.tsx` (replace the placeholder)

**Interfaces:**
- Consumes: `useAuth()`; `getMyProfile`; `listMyDogs`; `ageFromISO`; `Avatar`, `DogParkBackground`, `BrandLockup`; theme. Uses `useFocusEffect` to reload when returning from edit screens.
- Produces: the profile home — owner card (avatar, name, age, gender), an "edit profile" action, a dogs list (each dog → its edit screen), an "add dog" button, and sign-out. If the profile is incomplete (no name/photo/dob), shows a "complete your profile" prompt routing to edit-profile.

- [ ] **Step 1: Replace the home screen**

`app/(app)/home.tsx`:
```tsx
import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import DogParkBackground from '../../src/components/DogParkBackground';
import BrandLockup from '../../src/components/BrandLockup';
import Avatar from '../../src/components/Avatar';
import { useAuth } from '../../src/state/AuthContext';
import { getMyProfile, saveMyProfile } from '../../src/services/profile'; // saveMyProfile unused here but kept import minimal
import { listMyDogs } from '../../src/services/dogs';
import { ageFromISO } from '../../src/lib/age';
import { OwnerProfile, Dog, GENDER_OPTIONS } from '../../src/types/profile';
import { colors, font, radius, shadow } from '../../src/theme';

const genderLabel = (g: OwnerProfile['gender']) => GENDER_OPTIONS.find((o) => o.value === g)?.label ?? '';

export default function Home() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session!.user.id;
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyProfile(userId).then(({ data }) => active && setProfile(data));
      listMyDogs(userId).then(({ data }) => active && setDogs(data));
      return () => { active = false; };
    }, [userId]),
  );

  const incomplete = !profile?.display_name || !profile?.photo_url || !profile?.date_of_birth;
  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <BrandLockup size={28} />
            <Pressable testID="signout-btn" onPress={signOut}><Text style={styles.signout}>התנתק</Text></Pressable>
          </View>

          {incomplete ? (
            <Pressable onPress={() => router.push('/(app)/edit-profile')} style={[styles.completeCard, shadow.card]}>
              <Text style={styles.completeEmoji}>👋</Text>
              <Text style={styles.completeTitle}>בוא נשלים את הפרופיל</Text>
              <Text style={styles.completeSub}>שם, תמונה ותאריך לידה — ויוצאים לדרך</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/(app)/edit-profile')} style={[styles.ownerCard, shadow.card]}>
              <Avatar uri={profile!.photo_url} fallback="🧑" size={72} />
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{profile!.display_name}</Text>
                <Text style={styles.ownerMeta}>
                  {ageFromISO(profile!.date_of_birth!, utcToday)} · {genderLabel(profile!.gender)}
                </Text>
              </View>
              <Text style={styles.edit}>עריכה ✏️</Text>
            </Pressable>
          )}

          <View style={styles.dogsHeader}>
            <Text style={styles.dogsTitle}>הכלבים שלי 🐾</Text>
            <Pressable testID="add-dog" onPress={() => router.push('/(app)/dog/new')} style={styles.addBtn}>
              <Text style={styles.addText}>+ הוסף</Text>
            </Pressable>
          </View>

          {dogs.length === 0 ? (
            <Text style={styles.empty}>עדיין אין כלבים. הוסף את החבר הראשון! 🐶</Text>
          ) : (
            dogs.map((d) => (
              <Pressable key={d.id} onPress={() => router.push(`/(app)/dog/${d.id}`)} style={[styles.dogCard, shadow.card]}>
                <Avatar uri={d.photo_url} fallback="🐶" size={56} />
                <View style={styles.dogInfo}>
                  <Text style={styles.dogName}>{d.name}</Text>
                  <Text style={styles.dogMeta}>{d.breed} · {d.age} שנים</Text>
                </View>
                <Text style={styles.chevron}>‹</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 16 },
  topbar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  signout: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },

  completeCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line },
  completeEmoji: { fontSize: 40 },
  completeTitle: { fontFamily: font.black, fontSize: 20, color: colors.bark },
  completeSub: { fontFamily: font.regular, fontSize: 14, color: colors.caramel, textAlign: 'center' },

  ownerCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line },
  ownerInfo: { flex: 1 },
  ownerName: { fontFamily: font.bold, fontSize: 18, color: colors.bark, textAlign: 'right' },
  ownerMeta: { fontFamily: font.regular, fontSize: 14, color: colors.caramel, textAlign: 'right' },
  edit: { fontFamily: font.medium, color: colors.coralDeep, fontSize: 13 },

  dogsHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  dogsTitle: { fontFamily: font.black, fontSize: 18, color: colors.bark },
  addBtn: { backgroundColor: colors.coralSoft, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 16 },
  addText: { fontFamily: font.bold, color: colors.coralDeep, fontSize: 14 },
  empty: { fontFamily: font.regular, color: colors.inkSoft, textAlign: 'center', marginTop: 12 },

  dogCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line },
  dogInfo: { flex: 1 },
  dogName: { fontFamily: font.bold, fontSize: 16, color: colors.bark, textAlign: 'right' },
  dogMeta: { fontFamily: font.regular, fontSize: 13, color: colors.caramel, textAlign: 'right' },
  chevron: { fontFamily: font.bold, fontSize: 22, color: colors.inkSoft },
});
```

- [ ] **Step 2: Remove the now-unused import**

In `app/(app)/home.tsx` Step 1 the import line pulls `saveMyProfile` which Home does not use. Edit the import to drop it:
```tsx
import { getMyProfile } from '../../src/services/profile';
```

- [ ] **Step 3: Verify everything compiles and tests pass**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: all tests pass (Plan 01 suite + ageFromISO, profileService, dogs, storage).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/home.tsx"
git commit -m "feat(profile): real home screen with owner profile and dogs list"
```

---

## Self-Review (completed)

**Spec coverage:**
- Owner profile (name, photo, date_of_birth, gender, bio) → Tasks 1, 2, 4, 9. ✓
- `age` derived from date_of_birth → Task 3 (`ageFromISO`), shown on Home (Task 11). ✓
- Dog profiles (name, breed/type, age, photo required; size, description optional) → Tasks 1, 2, 5, 10. ✓
- Photo upload to Supabase Storage → Tasks 1 (buckets+policies), 6 (uploadImage), 7 (picker), used in 9 & 10. ✓
- Server-side 18+ enforcement (carry-forward) → Task 1 (`enforce_adult_profile` trigger) + client check in Task 9. ✓
- Replace placeholder Home → Task 11. ✓
- RLS on dogs + storage → Task 1. ✓
- Dog-park design system reuse → Tasks 8–11 use `src/theme.ts`, `DogParkBackground`, `Avatar`, `FormField`. ✓

**Deferred to later plans (not this one):** search (F26/F27), playdate calendar, the live map/walk, matchmaking, chat. The `dogs.breed` index (Task 1) pre-stages "search dogs by type."

**Placeholder scan:** No TBD/TODO; every code step has complete code. The one intentional two-step edit (Task 11 Step 1 then Step 2 trimming the import) is called out explicitly.

**Type consistency:** `OwnerProfile`/`Dog`/`Gender`/`DogSize` defined in Task 2 and used identically in Tasks 4, 5, 9, 10, 11. Service signatures (`getMyProfile`, `saveMyProfile`, `listMyDogs`, `createDog`, `updateDog`, `deleteDog`, `uploadImage`, `ageFromISO`, `pickSquareImage`) match across producer and consumer tasks. ✓

**Manual/external steps (can't be unit-tested):** applying migration `0002` and creating buckets in the Supabase dashboard (Task 1 Step 2); granting photo-library permission on device. Flagged in-task.
```
