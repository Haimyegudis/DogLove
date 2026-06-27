# כלב LOVE — Plan 04: Matchmaking / Playdates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an owner browse other dogs, send a **playdate request** from one of their dogs to another dog, and let the recipient **accept or decline** — and on accept, automatically open a **conversation** (the chat itself is Plan 05).

**Architecture:** Continues the Expo SDK 54 + Supabase stack. New migration adds `playdate_requests` + `conversations` tables under RLS, plus four RPCs (`browse_dogs`, `incoming_requests`, `outgoing_requests`, `respond_to_request`) that do the enriched reads and the atomic accept→conversation write server-side. A thin unit-tested service wraps them; screens follow the dog-park design. A new **Playdates** bottom tab hosts incoming/outgoing requests; browsing is reached from there.

**Tech Stack:** Expo SDK 54, TypeScript, `@supabase/supabase-js`, PostgreSQL RPCs, Expo Router, Jest + `@testing-library/react-native`.

## Global Constraints

- App name **כלב LOVE** (Hebrew **כלב** right, **LOVE** left). RTL first-class on all new screens.
- TypeScript everywhere. Jest + @testing-library/react-native. Keep the suite green; `npm test` before each commit.
- **playdate_requests** fields: `from_dog_id`, `to_dog_id`, `status` (`pending`/`accepted`/`declined`). **conversations**: `owner_a_id`, `owner_b_id` (normalized so `owner_a_id < owner_b_id`, unique pair).
- **Accept creates exactly one conversation** (dedup via unique pair + `on conflict do nothing`). Chat UI is Plan 05 — this plan only creates the conversation row.
- **RLS on every table.** A user reads a `playdate_request` only where they own the `from_dog` or the `to_dog`; inserts only where they own the `from_dog`. A user reads a `conversation` only where they are `owner_a_id` or `owner_b_id`. The accept/decline write goes through a `security definer` RPC that checks the caller owns the `to_dog`.
- Reads that join dogs+owners go through **RPCs** (`browse_dogs`, `incoming_requests`, `outgoing_requests`) — the client passes no SQL.
- Secrets via Expo env (`.env` git-ignored). Use the existing `supabase` client.
- Follow `src/theme.ts` and reuse `DogParkBackground`, `Avatar`.
- Dog-park copy is Hebrew; identifiers English.

**Repo root:** `C:\Apps\DogLove` (git repo, branch `feat/plan-01-foundation-auth`).
**Migrations:** the controller applies migration `0006` via the pooler script (host `aws-1-ap-southeast-1.pooler.supabase.com`, user `postgres.jynyrowglsojakfwcufm`). The user does NOT paste SQL.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0006_matchmaking.sql` | `playdate_requests` + `conversations` tables, RLS, RPCs `browse_dogs`/`incoming_requests`/`outgoing_requests`/`respond_to_request` |
| `src/types/match.ts` | `RequestStatus`, `BrowseDog`, `PlaydateRequestRow` types |
| `src/services/match.ts` | `browseDogs`, `sendPlaydateRequest`, `listIncoming`, `listOutgoing`, `respondToRequest` |
| `app/(app)/(tabs)/playdates.tsx` | Playdates tab: incoming (accept/decline) + outgoing (status) + a "browse" button |
| `app/(app)/browse.tsx` | Browse other dogs (cards) → tap → request modal |
| `app/(app)/request/[dogId].tsx` | Dog detail + "Request Playdate" (choose which of my dogs sends it) |
| `app/(app)/(tabs)/_layout.tsx` | Add the Playdates tab (modify) |
| `src/components/DogCard.tsx` | Reusable dog card (avatar, name, breed, owner) |
| `__tests__/match.test.ts` | Tests for the matchmaking service (mocked supabase) |

---

## Task 1: Migration 0006 — matchmaking tables + RPCs

**Files:**
- Create: `supabase/migrations/0006_matchmaking.sql`

**Interfaces:**
- Consumes: `dogs`, `profiles` tables.
- Produces: `playdate_requests`, `conversations`; RPCs `browse_dogs(p_limit int)`, `incoming_requests()`, `outgoing_requests()`, `respond_to_request(p_request_id uuid, p_accept boolean)`.

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/0006_matchmaking.sql`:
```sql
-- playdate_requests: one dog asking another for a playdate
create table if not exists public.playdate_requests (
  id uuid primary key default gen_random_uuid(),
  from_dog_id uuid not null references public.dogs (id) on delete cascade,
  to_dog_id uuid not null references public.dogs (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists pr_to_dog_idx on public.playdate_requests (to_dog_id);
create index if not exists pr_from_dog_idx on public.playdate_requests (from_dog_id);

alter table public.playdate_requests enable row level security;

drop policy if exists "pr_select_involved" on public.playdate_requests;
create policy "pr_select_involved" on public.playdate_requests for select using (
  exists (select 1 from public.dogs d where d.id = from_dog_id and d.owner_id = auth.uid())
  or exists (select 1 from public.dogs d where d.id = to_dog_id and d.owner_id = auth.uid())
);

drop policy if exists "pr_insert_own_from" on public.playdate_requests;
create policy "pr_insert_own_from" on public.playdate_requests for insert with check (
  exists (select 1 from public.dogs d where d.id = from_dog_id and d.owner_id = auth.uid())
);

-- conversations: normalized owner pair (owner_a < owner_b), unique
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_a_id uuid not null references public.profiles (id) on delete cascade,
  owner_b_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_a_id, owner_b_id)
);

alter table public.conversations enable row level security;

drop policy if exists "conv_select_member" on public.conversations;
create policy "conv_select_member" on public.conversations for select using (
  auth.uid() = owner_a_id or auth.uid() = owner_b_id
);

-- Browse other people's dogs (newest first), excluding the caller's own dogs.
create or replace function public.browse_dogs(p_limit int default 50)
returns table (dog_id uuid, name text, breed text, age int, photo_url text, owner_id uuid, owner_name text)
language sql stable as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name
  from public.dogs d
  join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid()
  order by d.created_at desc
  limit p_limit;
$$;

-- Requests TO my dogs (incoming), with the requesting dog + owner.
create or replace function public.incoming_requests()
returns table (request_id uuid, status text, created_at timestamptz,
  dog_id uuid, dog_name text, dog_breed text, dog_photo text, owner_name text)
language sql stable as $$
  select r.id, r.status, r.created_at, fd.id, fd.name, fd.breed, fd.photo_url, p.display_name
  from public.playdate_requests r
  join public.dogs td on td.id = r.to_dog_id
  join public.dogs fd on fd.id = r.from_dog_id
  join public.profiles p on p.id = fd.owner_id
  where td.owner_id = auth.uid()
  order by r.created_at desc;
$$;

-- Requests FROM my dogs (outgoing), with the target dog + owner.
create or replace function public.outgoing_requests()
returns table (request_id uuid, status text, created_at timestamptz,
  dog_id uuid, dog_name text, dog_breed text, dog_photo text, owner_name text)
language sql stable as $$
  select r.id, r.status, r.created_at, td.id, td.name, td.breed, td.photo_url, p.display_name
  from public.playdate_requests r
  join public.dogs fd on fd.id = r.from_dog_id
  join public.dogs td on td.id = r.to_dog_id
  join public.profiles p on p.id = td.owner_id
  where fd.owner_id = auth.uid()
  order by r.created_at desc;
$$;

-- Accept/decline. On accept, create the (deduped) conversation. The caller
-- must own the to_dog. security definer so the conversation insert is atomic.
create or replace function public.respond_to_request(p_request_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_from_owner uuid;
  v_to_owner uuid;
begin
  select fd.owner_id, td.owner_id into v_from_owner, v_to_owner
  from public.playdate_requests r
  join public.dogs fd on fd.id = r.from_dog_id
  join public.dogs td on td.id = r.to_dog_id
  where r.id = p_request_id;

  if v_to_owner is null then raise exception 'request not found'; end if;
  if v_caller <> v_to_owner then raise exception 'not authorized'; end if;

  update public.playdate_requests
    set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_request_id;

  if p_accept then
    insert into public.conversations (owner_a_id, owner_b_id)
    values (least(v_from_owner, v_to_owner), greatest(v_from_owner, v_to_owner))
    on conflict (owner_a_id, owner_b_id) do nothing;
  end if;
end;
$$;
```

- [ ] **Step 2: Apply the migration (controller, via pooler script)**

The controller runs the pooler apply script against `0006_matchmaking.sql` and confirms `APPLIED`/`MIGRATION_OK`. The user does NOT paste SQL.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_matchmaking.sql
git commit -m "feat(db): playdate_requests + conversations + matchmaking RPCs"
```

---

## Task 2: Matchmaking types

**Files:**
- Create: `src/types/match.ts`

**Interfaces:**
- Produces:
  - `type RequestStatus = 'pending' | 'accepted' | 'declined'`
  - `interface BrowseDog { dog_id: string; name: string; breed: string; age: number; photo_url: string; owner_id: string; owner_name: string | null }`
  - `interface PlaydateRequestRow { request_id: string; status: RequestStatus; created_at: string; dog_id: string; dog_name: string; dog_breed: string; dog_photo: string; owner_name: string | null }`

- [ ] **Step 1: Create the types**

`src/types/match.ts`:
```ts
export type RequestStatus = 'pending' | 'accepted' | 'declined';

export interface BrowseDog {
  dog_id: string;
  name: string;
  breed: string;
  age: number;
  photo_url: string;
  owner_id: string;
  owner_name: string | null;
}

export interface PlaydateRequestRow {
  request_id: string;
  status: RequestStatus;
  created_at: string;
  dog_id: string;
  dog_name: string;
  dog_breed: string;
  dog_photo: string;
  owner_name: string | null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/match.ts
git commit -m "feat(types): add matchmaking types"
```

---

## Task 3: Matchmaking service

**Files:**
- Create: `src/services/match.ts`
- Test: `__tests__/match.test.ts`

**Interfaces:**
- Consumes: `supabase` (its `.from` and `.rpc`); `BrowseDog`, `PlaydateRequestRow` from `src/types/match.ts`.
- Produces:
  - `browseDogs(limit?: number): Promise<{ data: BrowseDog[]; error: string | null }>`
  - `sendPlaydateRequest(fromDogId: string, toDogId: string): Promise<{ error: string | null }>`
  - `listIncoming(): Promise<{ data: PlaydateRequestRow[]; error: string | null }>`
  - `listOutgoing(): Promise<{ data: PlaydateRequestRow[]; error: string | null }>`
  - `respondToRequest(requestId: string, accept: boolean): Promise<{ error: string | null }>`

- [ ] **Step 1: Write the failing tests**

`__tests__/match.test.ts`:
```ts
const rpc = jest.fn();
const insert = jest.fn();
const from = jest.fn(() => ({ insert }));
jest.mock('../src/lib/supabase', () => ({ supabase: { rpc, from } }));
import { browseDogs, sendPlaydateRequest, listIncoming, listOutgoing, respondToRequest } from '../src/services/match';

beforeEach(() => jest.clearAllMocks());

test('browseDogs calls browse_dogs rpc and returns rows', async () => {
  rpc.mockResolvedValue({ data: [{ dog_id: 'd2', name: 'Bella' }], error: null });
  const res = await browseDogs(20);
  expect(rpc).toHaveBeenCalledWith('browse_dogs', { p_limit: 20 });
  expect(res.data).toHaveLength(1);
  expect(res.error).toBeNull();
});

test('sendPlaydateRequest inserts from/to dog ids', async () => {
  insert.mockResolvedValue({ error: null });
  const res = await sendPlaydateRequest('d1', 'd2');
  expect(from).toHaveBeenCalledWith('playdate_requests');
  expect(insert).toHaveBeenCalledWith({ from_dog_id: 'd1', to_dog_id: 'd2' });
  expect(res.error).toBeNull();
});

test('listIncoming calls incoming_requests rpc', async () => {
  rpc.mockResolvedValue({ data: [], error: null });
  await listIncoming();
  expect(rpc).toHaveBeenCalledWith('incoming_requests');
});

test('listOutgoing calls outgoing_requests rpc', async () => {
  rpc.mockResolvedValue({ data: [], error: null });
  await listOutgoing();
  expect(rpc).toHaveBeenCalledWith('outgoing_requests');
});

test('respondToRequest calls respond_to_request rpc with accept flag', async () => {
  rpc.mockResolvedValue({ error: null });
  const res = await respondToRequest('r1', true);
  expect(rpc).toHaveBeenCalledWith('respond_to_request', { p_request_id: 'r1', p_accept: true });
  expect(res.error).toBeNull();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest __tests__/match.test.ts`
Expected: FAIL ("Cannot find module '../src/services/match'").

- [ ] **Step 3: Implement the service**

`src/services/match.ts`:
```ts
import { supabase } from '../lib/supabase';
import type { BrowseDog, PlaydateRequestRow } from '../types/match';

export async function browseDogs(limit = 50) {
  const { data, error } = await supabase.rpc('browse_dogs', { p_limit: limit });
  return { data: (data as BrowseDog[]) ?? [], error: error?.message ?? null };
}

export async function sendPlaydateRequest(fromDogId: string, toDogId: string) {
  const { error } = await supabase.from('playdate_requests').insert({ from_dog_id: fromDogId, to_dog_id: toDogId });
  return { error: error?.message ?? null };
}

export async function listIncoming() {
  const { data, error } = await supabase.rpc('incoming_requests');
  return { data: (data as PlaydateRequestRow[]) ?? [], error: error?.message ?? null };
}

export async function listOutgoing() {
  const { data, error } = await supabase.rpc('outgoing_requests');
  return { data: (data as PlaydateRequestRow[]) ?? [], error: error?.message ?? null };
}

export async function respondToRequest(requestId: string, accept: boolean) {
  const { error } = await supabase.rpc('respond_to_request', { p_request_id: requestId, p_accept: accept });
  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx jest __tests__/match.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/match.ts __tests__/match.test.ts
git commit -m "feat(match): add matchmaking service"
```

---

## Task 4: Reusable DogCard

**Files:**
- Create: `src/components/DogCard.tsx`

**Interfaces:**
- Consumes: `Avatar`; theme.
- Produces: `<DogCard photo name breed subtitle onPress />` — a tappable row card (avatar + name + breed + an optional subtitle line, e.g. owner name).

- [ ] **Step 1: Implement DogCard**

`src/components/DogCard.tsx`:
```tsx
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { colors, font, radius, shadow } from '../theme';

type Props = {
  photo: string | null;
  name: string;
  breed: string;
  subtitle?: string;
  onPress?: () => void;
  right?: string;
};

export default function DogCard({ photo, name, breed, subtitle, onPress, right }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, shadow.card, pressed && onPress && styles.pressed]}>
      <Avatar uri={photo} fallback="🐶" size={56} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.breed}>{breed}{subtitle ? ` · ${subtitle}` : ''}</Text>
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line },
  info: { flex: 1 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.bark, textAlign: 'right' },
  breed: { fontFamily: font.regular, fontSize: 13, color: colors.caramel, textAlign: 'right' },
  right: { fontFamily: font.bold, fontSize: 13, color: colors.coralDeep },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.92 },
});
```

- [ ] **Step 2: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/DogCard.tsx
git commit -m "feat(ui): add DogCard component"
```

---

## Task 5: Browse dogs screen

**Files:**
- Create: `app/(app)/browse.tsx`

**Interfaces:**
- Consumes: `browseDogs`; `DogCard`; `DogParkBackground`; theme; `BrowseDog`. Routes to `/(app)/request/<dogId>`.
- Produces: a screen listing other dogs; each card taps through to the request screen (passing the dog id).

- [ ] **Step 1: Implement the browse screen**

`app/(app)/browse.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DogParkBackground from '../../src/components/DogParkBackground';
import DogCard from '../../src/components/DogCard';
import { browseDogs } from '../../src/services/match';
import type { BrowseDog } from '../../src/types/match';
import { colors, font } from '../../src/theme';

export default function Browse() {
  const router = useRouter();
  const [dogs, setDogs] = useState<BrowseDog[]>([]);

  useEffect(() => { browseDogs(50).then(({ data }) => setDogs(data)); }, []);

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>כלבים להכרות 🐾</Text>
          {dogs.length === 0 ? (
            <Text style={styles.empty}>עדיין אין כלבים אחרים. חזור מאוחר יותר!</Text>
          ) : (
            dogs.map((d) => (
              <DogCard
                key={d.dog_id}
                photo={d.photo_url}
                name={d.name}
                breed={d.breed}
                subtitle={d.owner_name ?? undefined}
                onPress={() => router.push(`/(app)/request/${d.dog_id}`)}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 12 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.bark, textAlign: 'center', marginBottom: 4 },
  empty: { fontFamily: font.regular, color: colors.inkSoft, textAlign: 'center', marginTop: 20 },
});
```

- [ ] **Step 2: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/browse.tsx"
git commit -m "feat(match): add browse dogs screen"
```

---

## Task 6: Request playdate screen

**Files:**
- Create: `app/(app)/request/[dogId].tsx`

**Interfaces:**
- Consumes: `browseDogs` (to find the target dog's display info), `listMyDogs` (to pick the sending dog), `sendPlaydateRequest`; `useAuth`; `Avatar`, `DogParkBackground`; theme. Route param `dogId` (the target dog).
- Produces: a screen showing the target dog and the owner's dogs as choosable senders; sending creates a `pending` request and routes back.

- [ ] **Step 1: Implement the request screen**

`app/(app)/request/[dogId].tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DogParkBackground from '../../../src/components/DogParkBackground';
import Avatar from '../../../src/components/Avatar';
import { useAuth } from '../../../src/state/AuthContext';
import { browseDogs, sendPlaydateRequest } from '../../../src/services/match';
import { listMyDogs } from '../../../src/services/dogs';
import type { BrowseDog } from '../../../src/types/match';
import type { Dog } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

export default function RequestPlaydate() {
  const router = useRouter();
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [target, setTarget] = useState<BrowseDog | null>(null);
  const [myDogs, setMyDogs] = useState<Dog[]>([]);
  const [fromDog, setFromDog] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    browseDogs(100).then(({ data }) => setTarget(data.find((d) => d.dog_id === dogId) ?? null));
    listMyDogs(userId).then(({ data }) => { setMyDogs(data); if (data[0]) setFromDog(data[0].id); });
  }, [dogId, userId]);

  async function onSend() {
    if (!fromDog) { Alert.alert('אין כלב', 'הוסף קודם פרופיל כלב.'); return; }
    setBusy(true);
    const { error } = await sendPlaydateRequest(fromDog, dogId);
    setBusy(false);
    if (error) { Alert.alert('שליחה נכשלה', error); return; }
    Alert.alert('נשלח! 🐾', 'הבקשה נשלחה. תקבל עדכון כשיענו.');
    router.back();
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {target && (
            <View style={styles.targetCard}>
              <Avatar uri={target.photo_url} fallback="🐶" size={110} />
              <Text style={styles.name}>{target.name}</Text>
              <Text style={styles.meta}>{target.breed} · {target.age} שנים</Text>
              {target.owner_name ? <Text style={styles.owner}>הבעלים: {target.owner_name}</Text> : null}
            </View>
          )}

          <Text style={styles.section}>מי מבקש/ת לשחק?</Text>
          <View style={styles.chips}>
            {myDogs.map((d) => (
              <Pressable key={d.id} onPress={() => setFromDog(d.id)} style={[styles.chip, fromDog === d.id && styles.chipOn]}>
                <Text style={[styles.chipText, fromDog === d.id && styles.chipTextOn]}>{d.name}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable testID="send-request" disabled={busy} onPress={onSend}
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{busy ? 'שולח…' : 'בקשת משחק 🐾'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 16 },
  targetCard: { alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.line },
  name: { fontFamily: font.black, fontSize: 24, color: colors.bark },
  meta: { fontFamily: font.medium, fontSize: 15, color: colors.caramel },
  owner: { fontFamily: font.regular, fontSize: 14, color: colors.inkSoft },
  section: { fontFamily: font.bold, fontSize: 16, color: colors.bark, textAlign: 'right', marginTop: 6 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
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
git add "app/(app)/request"
git commit -m "feat(match): add request playdate screen"
```

---

## Task 7: Playdates tab (incoming + outgoing)

**Files:**
- Create: `app/(app)/(tabs)/playdates.tsx`
- Modify: `app/(app)/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `listIncoming`, `listOutgoing`, `respondToRequest`; `DogCard`; `DogParkBackground`; `useFocusEffect`; theme; `PlaydateRequestRow`. Routes to `/(app)/browse`.
- Produces: the Playdates tab — incoming requests (accept/decline buttons), outgoing requests (status), and a "browse dogs" button. Adds a third tab to the tab bar.

- [ ] **Step 1: Implement the Playdates tab**

`app/(app)/(tabs)/playdates.tsx`:
```tsx
import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import DogParkBackground from '../../../src/components/DogParkBackground';
import DogCard from '../../../src/components/DogCard';
import { listIncoming, listOutgoing, respondToRequest } from '../../../src/services/match';
import type { PlaydateRequestRow } from '../../../src/types/match';
import { colors, font, radius, shadow } from '../../../src/theme';

const statusLabel: Record<string, string> = { pending: 'ממתין', accepted: 'אושר ✓', declined: 'נדחה' };

export default function Playdates() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<PlaydateRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<PlaydateRequestRow[]>([]);

  const load = useCallback(() => {
    listIncoming().then(({ data }) => setIncoming(data));
    listOutgoing().then(({ data }) => setOutgoing(data));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(requestId: string, accept: boolean) {
    const { error } = await respondToRequest(requestId, accept);
    if (error) { Alert.alert('שגיאה', error); return; }
    load();
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.push('/(app)/browse')} style={[styles.browseBtn, shadow.soft]}>
            <Text style={styles.browseText}>+ חפש כלבים להכרות 🐾</Text>
          </Pressable>

          <Text style={styles.section}>בקשות שהתקבלו</Text>
          {incoming.length === 0 ? <Text style={styles.empty}>אין בקשות חדשות</Text> : incoming.map((r) => (
            <View key={r.request_id} style={styles.reqWrap}>
              <DogCard photo={r.dog_photo} name={r.dog_name} breed={r.dog_breed} subtitle={r.owner_name ?? undefined} right={statusLabel[r.status]} />
              {r.status === 'pending' && (
                <View style={styles.actions}>
                  <Pressable onPress={() => respond(r.request_id, true)} style={[styles.act, styles.accept]}><Text style={styles.actText}>אישור</Text></Pressable>
                  <Pressable onPress={() => respond(r.request_id, false)} style={[styles.act, styles.decline]}><Text style={styles.actTextDark}>דחייה</Text></Pressable>
                </View>
              )}
            </View>
          ))}

          <Text style={styles.section}>בקשות שנשלחו</Text>
          {outgoing.length === 0 ? <Text style={styles.empty}>עוד לא שלחת בקשות</Text> : outgoing.map((r) => (
            <DogCard key={r.request_id} photo={r.dog_photo} name={r.dog_name} breed={r.dog_breed} subtitle={r.owner_name ?? undefined} right={statusLabel[r.status]} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 12 },
  browseBtn: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  browseText: { fontFamily: font.black, color: colors.white, fontSize: 16 },
  section: { fontFamily: font.black, fontSize: 18, color: colors.bark, textAlign: 'right', marginTop: 10 },
  empty: { fontFamily: font.regular, color: colors.inkSoft, textAlign: 'center', paddingVertical: 8 },
  reqWrap: { gap: 8 },
  actions: { flexDirection: 'row-reverse', gap: 8 },
  act: { flex: 1, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center' },
  accept: { backgroundColor: colors.coral },
  decline: { backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.line },
  actText: { fontFamily: font.bold, color: colors.white, fontSize: 15 },
  actTextDark: { fontFamily: font.bold, color: colors.caramel, fontSize: 15 },
});
```

- [ ] **Step 2: Add the Playdates tab to the layout**

In `app/(app)/(tabs)/_layout.tsx`, add a third `<Tabs.Screen>` between Map and Profile (keep the existing two):
```tsx
      <Tabs.Screen
        name="playdates"
        options={{ title: 'משחקים', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>❤️</Text> }}
      />
```
(Place it after the `index` screen and before `profile` so tab order is Map · Playdates · Profile.)

- [ ] **Step 3: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(tabs)/playdates.tsx" "app/(app)/(tabs)/_layout.tsx"
git commit -m "feat(match): add Playdates tab with incoming/outgoing requests"
```

---

## Self-Review (completed)

**Spec coverage (Matchmaking, Flow C):**
- `playdate_requests` (from_dog_id, to_dog_id, status) → Task 1. ✓
- `conversations` (owner pair, deduped) created on accept → Task 1 (`respond_to_request` RPC). ✓
- Browse nearby/other dogs → Tasks 4, 5 (`browse_dogs`). ✓
- Request Playdate (pick sending dog) → Task 6 (`sendPlaydateRequest`). ✓
- Accept/Decline → Task 7 + `respondToRequest`. ✓
- RLS: read requests only if involved; insert only own from_dog; read conversations only if member → Task 1. ✓
- Matches/Playdates tab → Task 7. ✓

**Deferred:** the chat UI/messages (Plan 05 — this plan only creates the conversation row), push notifications (later), search filters (later), playdate calendar (later). Browsing uses `browse_dogs` (all other dogs) rather than only active walkers, so matchmaking is usable when nobody is walking — a deliberate, spec-consistent choice (the map already covers "active nearby").

**Placeholder scan:** No TBD/TODO; every code step has complete code. The migration apply (Task 1 Step 2) is a controller action via the pooler — explicitly marked.

**Type consistency:** `BrowseDog`, `PlaydateRequestRow`, `RequestStatus` defined in Task 2, used identically in Tasks 3, 5, 6, 7. Service signatures (`browseDogs`, `sendPlaydateRequest`, `listIncoming`, `listOutgoing`, `respondToRequest`) and RPC names/params (`browse_dogs`/`p_limit`, `incoming_requests`, `outgoing_requests`, `respond_to_request`/`p_request_id`/`p_accept`) match between the migration (Task 1) and the service (Task 3). DogCard props consistent across Tasks 4, 5, 7. ✓
```
