## Task 7: Brand lockup component (כלב LOVE, RTL)

**Files:**
- Create: `src/components/BrandLockup.tsx`
- Test: `__tests__/BrandLockup.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<BrandLockup />` — renders "כלב" and "LOVE" with `testID="brand-lockup"`, Hebrew word on the right.

- [ ] **Step 1: Write the failing test**

`__tests__/BrandLockup.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import BrandLockup from '../src/components/BrandLockup';

test('renders both parts of the brand name', () => {
  const { getByText, getByTestId } = render(<BrandLockup />);
  expect(getByTestId('brand-lockup')).toBeTruthy();
  expect(getByText('כלב')).toBeTruthy();
  expect(getByText('LOVE')).toBeTruthy();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- __tests__/BrandLockup.test.tsx`
Expected: FAIL ("Cannot find module '../src/components/BrandLockup'").

- [ ] **Step 3: Implement the component**

`src/components/BrandLockup.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function BrandLockup() {
  // Row reversed so the Hebrew word sits on the right, LOVE on the left.
  return (
    <View testID="brand-lockup" style={styles.row}>
      <Text style={styles.love}>LOVE</Text>
      <Text style={styles.kelev}>כלב</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  kelev: { fontSize: 32, fontWeight: '800' },
  love: { fontSize: 32, fontWeight: '800', letterSpacing: 1 },
});
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- __tests__/BrandLockup.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BrandLockup.tsx __tests__/BrandLockup.test.tsx
git commit -m "feat(ui): add כלב LOVE brand lockup component"
```

---

