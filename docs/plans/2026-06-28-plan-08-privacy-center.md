# כלב LOVE — Plan 08: Privacy Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** A Privacy center where the owner sees what's shared, toggles **discoverability** (hide from browse/search/matchmaking), and can **delete their account + all data**.

**Architecture:** Expo SDK 54 + Supabase. The `is_discoverable` flag (already on `profiles`) now gates the discovery RPCs; a `security definer` `delete_my_account` RPC removes the auth user (cascading all app data). Thin unit-tested service; one Privacy screen reached from Profile. Pastel mockup design.

**Tech Stack:** Expo SDK 54, TypeScript, Supabase RPC, Jest.

## Global Constraints
- App **כלב love**, RTL. TypeScript; Jest; keep suite green.
- `is_discoverable` (boolean, default true on `profiles`) controls whether you appear in `browse_dogs` / `search_dogs` / `search_users`.
- **Account deletion** removes the user and all their data (cascade from `auth.users`); the client signs out afterward.
- Design tokens `src/theme.ts`. Hebrew copy; English identifiers.

**Repo root:** `C:\Apps\DogLove` (branch `feat/plan-01-foundation-auth`). Migrations applied by controller via pooler.

---

## File Structure
| File | Responsibility |
|---|---|
| `supabase/migrations/0013_privacy.sql` | `delete_my_account` RPC; recreate browse_dogs/search_dogs/search_users with `is_discoverable` filter; `get_my_settings` RPC |
| `src/services/privacy.ts` | `getDiscoverable`, `setDiscoverable`, `deleteAccount` |
| `app/(app)/privacy.tsx` | Privacy center screen |
| `app/(app)/(tabs)/profile.tsx` | Add "פרטיות" entry (modify) |
| `__tests__/privacy.test.ts` | Service tests |

---

## Task 1: Migration 0013 — privacy RPCs + discoverability filter

**Files:** Create `supabase/migrations/0013_privacy.sql` (controller writes + applies)

(Controller task — the full SQL is applied by the controller via the pooler. It: (a) creates `delete_my_account()` security-definer deleting `auth.users where id = auth.uid()`; (b) creates `get_my_settings()` returning `is_discoverable`; (c) recreates `browse_dogs`, `search_dogs`, `search_users` adding the `is_discoverable` filter on the OTHER user.)

- [ ] **Step 1–3:** controller writes/applies/commits `0013`. Produces RPCs `delete_my_account()`, `get_my_settings()` (returns `is_discoverable boolean`), and discovery RPCs that exclude non-discoverable users.

---

## Task 2: Privacy service

**Files:** Create `src/services/privacy.ts`, Test `__tests__/privacy.test.ts`

**Interfaces:** Produces:
- `getDiscoverable(): Promise<{ data: boolean; error: string | null }>` (via `get_my_settings` rpc)
- `setDiscoverable(userId: string, value: boolean): Promise<{ error: string | null }>` (update profiles)
- `deleteAccount(): Promise<{ error: string | null }>` (via `delete_my_account` rpc)

- [ ] **Step 1: Write the failing tests**

`__tests__/privacy.test.ts`:
```ts
jest.mock('../src/lib/supabase', () => {
  const eqUpd = jest.fn();
  const update = jest.fn(() => ({ eq: eqUpd }));
  const from = jest.fn(() => ({ update }));
  const rpc = jest.fn();
  return { supabase: { from, rpc }, __m: { eqUpd, update, from, rpc } };
});
import { getDiscoverable, setDiscoverable, deleteAccount } from '../src/services/privacy';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('getDiscoverable reads is_discoverable from get_my_settings', async () => {
  m.rpc.mockResolvedValue({ data: [{ is_discoverable: false }], error: null });
  const res = await getDiscoverable();
  expect(m.rpc).toHaveBeenCalledWith('get_my_settings');
  expect(res.data).toBe(false);
});

test('setDiscoverable updates the profile', async () => {
  m.eqUpd.mockResolvedValue({ error: null });
  await setDiscoverable('u1', true);
  expect(m.from).toHaveBeenCalledWith('profiles');
  expect(m.update).toHaveBeenCalledWith({ is_discoverable: true });
  expect(m.eqUpd).toHaveBeenCalledWith('id', 'u1');
});

test('deleteAccount calls delete_my_account rpc', async () => {
  m.rpc.mockResolvedValue({ error: null });
  const res = await deleteAccount();
  expect(m.rpc).toHaveBeenCalledWith('delete_my_account');
  expect(res.error).toBeNull();
});
```

- [ ] **Step 2: Run to confirm failure** — `npx jest __tests__/privacy.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/services/privacy.ts`:
```ts
import { supabase } from '../lib/supabase';

export async function getDiscoverable() {
  const { data, error } = await supabase.rpc('get_my_settings');
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row?.is_discoverable ?? true) as boolean, error: error?.message ?? null };
}

export async function setDiscoverable(userId: string, value: boolean) {
  const { error } = await supabase.from('profiles').update({ is_discoverable: value }).eq('id', userId);
  return { error: error?.message ?? null };
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Run to confirm pass** — `npx jest __tests__/privacy.test.ts` → PASS (3).
- [ ] **Step 5: Commit**
```bash
git add src/services/privacy.ts __tests__/privacy.test.ts
git commit -m "feat(privacy): add privacy service"
```

---

## Task 3: Privacy screen + profile entry

**Files:** Create `app/(app)/privacy.tsx`; Modify `app/(app)/(tabs)/profile.tsx`

**Interfaces:** Consumes `getDiscoverable`, `setDiscoverable`, `deleteAccount`; `useAuth`; theme.

- [ ] **Step 1: Implement the privacy screen**

`app/(app)/privacy.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/state/AuthContext';
import { getDiscoverable, setDiscoverable, deleteAccount } from '../../src/services/privacy';
import { colors, font, radius } from '../../src/theme';

const SHARED = [
  '👤 הפרופיל שלך (שם, תמונה, גיל, מגדר) גלוי בחיפוש ובהכרויות.',
  '🐕 פרופילי הכלבים שלך גלויים למשתמשים אחרים.',
  '📍 המיקום שלך משותף רק בזמן הליכה פעילה — ונפסק בסיומה.',
  '💬 הודעות גלויות רק למשתתפי השיחה.',
];

export default function Privacy() {
  const { session, signOut } = useAuth();
  const userId = session!.user.id;
  const [discoverable, setDisc] = useState(true);

  useEffect(() => { getDiscoverable().then(({ data }) => setDisc(data)); }, []);

  async function toggle(v: boolean) {
    setDisc(v);
    const { error } = await setDiscoverable(userId, v);
    if (error) { setDisc(!v); Alert.alert('שגיאה', error); }
  }

  function onDelete() {
    Alert.alert('מחיקת חשבון', 'הפעולה תמחק את החשבון וכל הנתונים לצמיתות. להמשיך?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק הכל', style: 'destructive', onPress: async () => {
        const { error } = await deleteAccount();
        if (error) { Alert.alert('שגיאה', error); return; }
        await signOut();
      } },
    ]);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>פרטיות 🔒</Text>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Switch value={discoverable} onValueChange={toggle} trackColor={{ true: colors.rose }} />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>הופעה בחיפוש ובהכרויות</Text>
                <Text style={styles.toggleSub}>כשמכובה, אחרים לא ימצאו אותך בחיפוש או בהכרויות.</Text>
              </View>
            </View>
          </View>

          <Text style={styles.section}>מה משותף?</Text>
          <View style={styles.card}>
            {SHARED.map((s, i) => <Text key={i} style={styles.sharedItem}>{s}</Text>)}
          </View>

          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>מחיקת חשבון וכל הנתונים</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.lineCool },
  toggleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1 },
  toggleTitle: { fontFamily: font.bold, fontSize: 15, color: colors.brandDark, textAlign: 'right' },
  toggleSub: { fontFamily: font.regular, fontSize: 12, color: colors.inkCoolSoft, textAlign: 'right' },
  section: { fontFamily: font.black, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  sharedItem: { fontFamily: font.regular, fontSize: 14, lineHeight: 22, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  deleteBtn: { backgroundColor: '#FDECEC', borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#F3C9C9' },
  deleteText: { fontFamily: font.bold, color: colors.danger, fontSize: 15 },
});
```

- [ ] **Step 2: Add a Privacy entry to the Profile tab**

In `app/(app)/(tabs)/profile.tsx`, near the sign-out button (`testID="signout-btn"`), add a Pressable above it that routes to privacy:
```tsx
<Pressable onPress={() => router.push('/(app)/privacy')} style={styles.privacyBtn}>
  <Text style={styles.privacyText}>פרטיות והגדרות 🔒</Text>
</Pressable>
```
Ensure `useRouter` is imported and a `router` is available (the file already uses expo-router). Add minimal styles `privacyBtn`/`privacyText` consistent with the screen (e.g. a light card-style button). If the profile screen lacks `useRouter`, add `import { useRouter } from 'expo-router'` and `const router = useRouter();` inside the component.

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; `npm test` green.
- [ ] **Step 4: Commit**
```bash
git add "app/(app)/privacy.tsx" "app/(app)/(tabs)/profile.tsx"
git commit -m "feat(privacy): privacy center screen + profile entry"
```

---

## Self-Review (completed)
- View what's shared → Task 3. ✓
- Discoverability toggle gating browse/search → Task 1 (RPC filter) + Tasks 2, 3. ✓
- Delete account + all data → Task 1 (`delete_my_account` cascade) + Tasks 2, 3. ✓
- **Type consistency:** service signatures + RPC names (`get_my_settings`, `delete_my_account`) match Task 1 ↔ 2 ↔ 3. ✓
- **Placeholder scan:** none. Account-deletion of `auth.users` requires the definer function to have the privilege; controller verifies on apply.
```
