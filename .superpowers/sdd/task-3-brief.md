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

