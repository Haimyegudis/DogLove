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

