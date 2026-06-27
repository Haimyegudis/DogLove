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

