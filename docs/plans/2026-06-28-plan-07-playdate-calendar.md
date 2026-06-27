# כלב LOVE — Plan 07: Playdate Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Let two matched owners schedule a playdate (date/time + place) from their chat, and see their upcoming/past playdates in a calendar list — each entry showing when, where, and who they're meeting.

**Architecture:** Expo SDK 54 + Supabase. `scheduled_playdates` table under RLS (a row visible/writable only to its two participants); a `security definer` `list_my_playdates` RPC for the enriched list; a thin unit-tested service; a calendar list screen + a "schedule" action from the chat screen. Pastel mockup design.

**Tech Stack:** Expo SDK 54, TypeScript, Supabase RPC, `@react-native-community/datetimepicker` (installed), Jest.

## Global Constraints
- App **כלב love**, RTL. TypeScript; Jest; keep suite green.
- `scheduled_playdates`: `organizer_id`, `guest_id` (profiles), `starts_at` (timestamptz), `location_name` (text), `status` (`scheduled`/`cancelled`/`completed`).
- **RLS:** a row is readable/insertable/updatable only by its `organizer_id` or `guest_id`.
- The enriched list (other participant's name) goes through a `security definer` RPC (profiles are own-row-RLS otherwise — same pattern as Plan 06's `0010`).
- Design tokens `src/theme.ts` (cool pastel). Hebrew copy; English identifiers.

**Repo root:** `C:\Apps\DogLove` (branch `feat/plan-01-foundation-auth`). Migrations applied by controller via pooler (host `aws-1-ap-southeast-1.pooler.supabase.com`, user `postgres.jynyrowglsojakfwcufm`).

---

## File Structure
| File | Responsibility |
|---|---|
| `supabase/migrations/0011_scheduled_playdates.sql` | `scheduled_playdates` table + RLS + `list_my_playdates` definer RPC + `conversation_other(p_conv)` helper |
| `src/types/playdate.ts` | `PlaydateRow` type |
| `src/services/playdates.ts` | `schedulePlaydate`, `listMyPlaydates`, `cancelPlaydate`, `otherInConversation` |
| `app/(app)/calendar.tsx` | Calendar list of playdates |
| `app/(app)/(tabs)/index.tsx` | Add "יומן" shortcut card (modify) |
| `app/(app)/chat/[id].tsx` | Add a "קבע מפגש" header action that opens a schedule prompt (modify) |
| `__tests__/playdates.test.ts` | Service tests |

---

## Task 1: Migration 0011 — scheduled_playdates

**Files:** Create `supabase/migrations/0011_scheduled_playdates.sql`

**Interfaces:** Produces `scheduled_playdates` table; `conversation_other(p_conv uuid)` (the other member's id) definer helper; `list_my_playdates()` definer RPC returning `id, starts_at, location_name, status, other_name, other_photo, is_organizer`.

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/0011_scheduled_playdates.sql`:
```sql
create table if not exists public.scheduled_playdates (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  location_name text,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  created_at timestamptz not null default now()
);
create index if not exists sp_participants_idx on public.scheduled_playdates (organizer_id, guest_id);

alter table public.scheduled_playdates enable row level security;

drop policy if exists "sp_select_party" on public.scheduled_playdates;
create policy "sp_select_party" on public.scheduled_playdates for select
  using (auth.uid() = organizer_id or auth.uid() = guest_id);

drop policy if exists "sp_insert_organizer" on public.scheduled_playdates;
create policy "sp_insert_organizer" on public.scheduled_playdates for insert
  with check (auth.uid() = organizer_id);

drop policy if exists "sp_update_party" on public.scheduled_playdates;
create policy "sp_update_party" on public.scheduled_playdates for update
  using (auth.uid() = organizer_id or auth.uid() = guest_id)
  with check (auth.uid() = organizer_id or auth.uid() = guest_id);

-- Other member of a conversation (used by the schedule action in chat).
create or replace function public.conversation_other(p_conv uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case when c.owner_a_id = auth.uid() then c.owner_b_id else c.owner_a_id end
  from public.conversations c
  where c.id = p_conv and (c.owner_a_id = auth.uid() or c.owner_b_id = auth.uid());
$$;

-- My playdates with the other participant's name/photo.
create or replace function public.list_my_playdates()
returns table (id uuid, starts_at timestamptz, location_name text, status text,
  other_name text, other_photo text, is_organizer boolean)
language sql stable security definer set search_path = public as $$
  select sp.id, sp.starts_at, sp.location_name, sp.status,
    other.display_name, other.photo_url, (sp.organizer_id = auth.uid())
  from public.scheduled_playdates sp
  join public.profiles other
    on other.id = case when sp.organizer_id = auth.uid() then sp.guest_id else sp.organizer_id end
  where sp.organizer_id = auth.uid() or sp.guest_id = auth.uid()
  order by sp.starts_at asc;
$$;
```

- [ ] **Step 2: Apply (controller via pooler)** — confirm `MIGRATION_OK`.
- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/0011_scheduled_playdates.sql
git commit -m "feat(db): scheduled_playdates table + RLS + list_my_playdates RPC"
```

---

## Task 2: Playdate types + service

**Files:** Create `src/types/playdate.ts`, `src/services/playdates.ts`, Test `__tests__/playdates.test.ts`

**Interfaces:** Produces:
- `interface PlaydateRow { id: string; starts_at: string; location_name: string | null; status: string; other_name: string | null; other_photo: string | null; is_organizer: boolean }`
- `schedulePlaydate(guestId: string, startsAtISO: string, locationName: string): Promise<{ error: string | null }>` (organizer = caller; insert with `organizer_id` omitted → set via RLS? No: pass organizer via auth — see impl: insert needs organizer_id = caller; the service gets it from the session, so signature includes `organizerId`)
  - Final signature: `schedulePlaydate(organizerId: string, guestId: string, startsAtISO: string, locationName: string)`
- `listMyPlaydates(): Promise<{ data: PlaydateRow[]; error: string | null }>`
- `cancelPlaydate(id: string): Promise<{ error: string | null }>`
- `otherInConversation(conversationId: string): Promise<{ data: string | null; error: string | null }>`

- [ ] **Step 1: Create the type**

`src/types/playdate.ts`:
```ts
export interface PlaydateRow {
  id: string;
  starts_at: string;
  location_name: string | null;
  status: string;
  other_name: string | null;
  other_photo: string | null;
  is_organizer: boolean;
}
```

- [ ] **Step 2: Write the failing tests**

`__tests__/playdates.test.ts`:
```ts
jest.mock('../src/lib/supabase', () => {
  const insert = jest.fn();
  const eqUpd = jest.fn();
  const update = jest.fn(() => ({ eq: eqUpd }));
  const from = jest.fn(() => ({ insert, update }));
  const rpc = jest.fn();
  return { supabase: { from, rpc }, __m: { insert, update, eqUpd, from, rpc } };
});
import { schedulePlaydate, listMyPlaydates, cancelPlaydate, otherInConversation } from '../src/services/playdates';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('schedulePlaydate inserts organizer/guest/time/place', async () => {
  m.insert.mockResolvedValue({ error: null });
  await schedulePlaydate('o1', 'g1', '2026-07-01T17:00:00Z', 'פארק');
  expect(m.from).toHaveBeenCalledWith('scheduled_playdates');
  expect(m.insert).toHaveBeenCalledWith({ organizer_id: 'o1', guest_id: 'g1', starts_at: '2026-07-01T17:00:00Z', location_name: 'פארק' });
});

test('listMyPlaydates calls the rpc', async () => {
  m.rpc.mockResolvedValue({ data: [{ id: 'p1' }], error: null });
  const res = await listMyPlaydates();
  expect(m.rpc).toHaveBeenCalledWith('list_my_playdates');
  expect(res.data).toHaveLength(1);
});

test('cancelPlaydate updates status to cancelled', async () => {
  m.eqUpd.mockResolvedValue({ error: null });
  await cancelPlaydate('p1');
  expect(m.update).toHaveBeenCalledWith({ status: 'cancelled' });
  expect(m.eqUpd).toHaveBeenCalledWith('id', 'p1');
});

test('otherInConversation calls conversation_other rpc', async () => {
  m.rpc.mockResolvedValue({ data: 'u2', error: null });
  const res = await otherInConversation('c1');
  expect(m.rpc).toHaveBeenCalledWith('conversation_other', { p_conv: 'c1' });
  expect(res.data).toBe('u2');
});
```

- [ ] **Step 3: Run to confirm failure** — `npx jest __tests__/playdates.test.ts` → FAIL.

- [ ] **Step 4: Implement**

`src/services/playdates.ts`:
```ts
import { supabase } from '../lib/supabase';
import type { PlaydateRow } from '../types/playdate';

export async function schedulePlaydate(organizerId: string, guestId: string, startsAtISO: string, locationName: string) {
  const { error } = await supabase.from('scheduled_playdates').insert({
    organizer_id: organizerId, guest_id: guestId, starts_at: startsAtISO, location_name: locationName,
  });
  return { error: error?.message ?? null };
}

export async function listMyPlaydates() {
  const { data, error } = await supabase.rpc('list_my_playdates');
  return { data: (data as PlaydateRow[]) ?? [], error: error?.message ?? null };
}

export async function cancelPlaydate(id: string) {
  const { error } = await supabase.from('scheduled_playdates').update({ status: 'cancelled' }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function otherInConversation(conversationId: string) {
  const { data, error } = await supabase.rpc('conversation_other', { p_conv: conversationId });
  return { data: (data as string | null) ?? null, error: error?.message ?? null };
}
```

- [ ] **Step 5: Run to confirm pass** — `npx jest __tests__/playdates.test.ts` → PASS (4).
- [ ] **Step 6: Commit**
```bash
git add src/types/playdate.ts src/services/playdates.ts __tests__/playdates.test.ts
git commit -m "feat(playdates): add scheduled playdates service"
```

---

## Task 3: Calendar screen + dashboard entry

**Files:** Create `app/(app)/calendar.tsx`; Modify `app/(app)/(tabs)/index.tsx`

**Interfaces:** Consumes `listMyPlaydates`, `cancelPlaydate`; `Avatar`; `useFocusEffect`; theme; `PlaydateRow`.

- [ ] **Step 1: Implement the calendar screen**

`app/(app)/calendar.tsx`:
```tsx
import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Avatar from '../../src/components/Avatar';
import { listMyPlaydates, cancelPlaydate } from '../../src/services/playdates';
import type { PlaydateRow } from '../../src/types/playdate';
import { colors, font, radius } from '../../src/theme';

const pad = (n: number) => String(n).padStart(2, '0');
function fmt(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const statusLabel: Record<string, string> = { scheduled: 'מתוכנן', cancelled: 'בוטל', completed: 'הושלם' };

export default function Calendar() {
  const [rows, setRows] = useState<PlaydateRow[]>([]);
  const load = useCallback(() => { listMyPlaydates().then(({ data }) => setRows(data)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onCancel(id: string) {
    Alert.alert('לבטל את המפגש?', '', [
      { text: 'לא', style: 'cancel' },
      { text: 'בטל מפגש', style: 'destructive', onPress: async () => { await cancelPlaydate(id); load(); } },
    ]);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>יומן מפגשים 📅</Text>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>אין מפגשים מתוכננים. קבע מפגש מתוך צ'אט!</Text>
          ) : rows.map((p) => (
            <View key={p.id} style={styles.card}>
              <Avatar uri={p.other_photo} fallback="🧑" size={48} />
              <View style={styles.info}>
                <Text style={styles.name}>{p.other_name ?? 'בעל כלב'}</Text>
                <Text style={styles.when}>{fmt(p.starts_at)}</Text>
                {p.location_name ? <Text style={styles.where}>📍 {p.location_name}</Text> : null}
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.status, p.status === 'cancelled' && styles.cancelled]}>{statusLabel[p.status] ?? p.status}</Text>
                {p.status === 'scheduled' ? (
                  <Pressable onPress={() => onCancel(p.id)}><Text style={styles.cancelBtn}>בטל</Text></Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center', marginTop: 12 },
  scroll: { padding: 16, gap: 10 },
  empty: { fontFamily: font.regular, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 24 },
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.lineCool },
  info: { flex: 1 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  when: { fontFamily: font.medium, fontSize: 13, color: colors.purple, textAlign: 'right' },
  where: { fontFamily: font.regular, fontSize: 12, color: colors.inkCoolSoft, textAlign: 'right' },
  rightCol: { alignItems: 'center', gap: 4 },
  status: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  cancelled: { color: colors.inkCoolSoft },
  cancelBtn: { fontFamily: font.medium, fontSize: 12, color: colors.danger },
});
```

- [ ] **Step 2: Add a calendar shortcut to the dashboard**

In `app/(app)/(tabs)/index.tsx`, inside `styles.grid`, add another `<Feature>` after the others:
```tsx
            <Feature title="יומן" sub="מפגשים מתוכננים" bg={colors.purpleSoft} icon="📅" onPress={() => router.push('/(app)/calendar')} />
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; `npm test` green.
- [ ] **Step 4: Commit**
```bash
git add "app/(app)/calendar.tsx" "app/(app)/(tabs)/index.tsx"
git commit -m "feat(playdates): add calendar screen + dashboard entry"
```

---

## Task 4: Schedule action in chat

**Files:** Modify `app/(app)/chat/[id].tsx`

**Interfaces:** Consumes `otherInConversation`, `schedulePlaydate`; `useAuth`; `DateTimePicker`. Adds a "קבע מפגש" button in the chat header that picks a date/time, asks for a place, and creates a scheduled playdate with the other participant.

- [ ] **Step 1: Add the schedule action**

In `app/(app)/chat/[id].tsx`:
1. Add imports: `import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';`, `import { Alert } from 'react-native';` (if not present), and `import { otherInConversation, schedulePlaydate } from '../../../src/services/playdates';`.
2. Add state: `const [showDate, setShowDate] = useState(false);` and `const [pickedDate, setPickedDate] = useState<Date | null>(null);`.
3. In the header row (next to the back button / title), add a `Pressable` with text `קבע מפגש 📅` that sets `setShowDate(true)`.
4. Render the picker when `showDate`:
```tsx
{showDate && (
  <DateTimePicker
    value={pickedDate ?? new Date(Date.now() + 3600_000)}
    mode="datetime"
    onChange={async (_e: DateTimePickerEvent, d?: Date) => {
      setShowDate(false);
      if (!d) return;
      const { data: otherId } = await otherInConversation(id);
      if (!otherId) { Alert.alert('שגיאה', 'לא נמצא משתתף'); return; }
      Alert.prompt
        ? Alert.prompt('מקום המפגש', 'איפה נפגשים?', async (place?: string) => {
            const { error } = await schedulePlaydate(userId, otherId, d.toISOString(), place || '');
            Alert.alert(error ? 'שגיאה' : 'נקבע! 📅', error || 'המפגש נוסף ליומן.');
          })
        : (async () => {
            const { error } = await schedulePlaydate(userId, otherId, d.toISOString(), '');
            Alert.alert(error ? 'שגיאה' : 'נקבע! 📅', error || 'המפגש נוסף ליומן.');
          })();
    }}
  />
)}
```
(Note: `Alert.prompt` is iOS-only; the Android branch schedules without a place name — acceptable for MVP.)

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean; `npm test` green (chat tests unaffected).
- [ ] **Step 3: Commit**
```bash
git add "app/(app)/chat/[id].tsx"
git commit -m "feat(playdates): schedule a playdate from chat"
```

---

## Self-Review (completed)
- `scheduled_playdates` (organizer, guest, starts_at, location, status) + RLS party-only → Task 1. ✓
- Calendar showing date/time, place, who you're meeting → Tasks 1 (`list_my_playdates`), 3. ✓
- Schedule from chat → Task 4 (`conversation_other` + `schedulePlaydate`). ✓
- Cancel → Tasks 2, 3. ✓
- Cross-user names via definer RPC (profiles own-row RLS) → Task 1. ✓
- **Type consistency:** `PlaydateRow` (Task 2) used in 3; service signatures + RPC names (`list_my_playdates`, `conversation_other`) match Task 1 ↔ 2 ↔ 4. ✓
- **Placeholder scan:** none. Android-no-place limitation documented (Task 4).
```
