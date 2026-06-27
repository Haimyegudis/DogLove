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

