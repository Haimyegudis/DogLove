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
