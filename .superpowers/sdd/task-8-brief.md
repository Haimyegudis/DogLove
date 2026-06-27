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

