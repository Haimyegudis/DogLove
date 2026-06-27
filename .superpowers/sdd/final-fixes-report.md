# Final Fixes Report — feat/plan-01-foundation-auth

## Fix 1 — Jest "worker failed to exit" warning

Added `afterAll(() => { const { supabase } = require('../src/lib/supabase'); supabase.auth.stopAutoRefresh?.(); });` to `__tests__/supabase.test.ts`.

`--detectOpenHandles` run after the fix showed **no open handles and no worker-exit warning**. Output was clean: 18 tests passed, no warnings. `forceExit` was NOT needed.

## Fix 2 — Duplicate test-renderer dependencies

Grepped all test and source files for `import ... from 'test-renderer'` and `require('test-renderer')`. **Zero matches** in test or source files.

However, `test-renderer` **cannot be removed**: it is a listed `peerDependencies` of `@testing-library/react-native@14.0.1` (see `node_modules/@testing-library/react-native/package.json` line `"test-renderer": "^1.0.0"`). Removing it would leave an unsatisfied peer dependency and break `npm install` warnings. Kept `test-renderer` in `package.json`.

## Fix 3 — Add explicit babel.config.js

Created `C:\Apps\DogLove\babel.config.js`. The spec prescribed `presets: ['babel-preset-expo']`, but `babel-preset-expo` is not hoisted to the project root — it lives nested at `node_modules/expo/node_modules/babel-preset-expo`. Used `require.resolve('expo/internal/babel-preset')` instead, which is the canonical re-export path that resolves correctly from the project root:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [require.resolve('expo/internal/babel-preset')],
  };
};
```

## Verification

### `npx tsc --noEmit`
```
(no output — clean)
```

### `npm test` (full output, final lines)
```
PASS __tests__/auth.test.ts
PASS __tests__/profile.test.ts
PASS __tests__/smoke.test.ts
PASS __tests__/consent.test.ts
PASS __tests__/age.test.ts
PASS __tests__/AuthContext.test.tsx
PASS __tests__/BrandLockup.test.tsx
PASS __tests__/supabase.test.ts

Test Suites: 8 passed, 8 total
Tests:       18 passed, 18 total
Snapshots:   0 total
Time:        7.318 s
Ran all test suites.
```

Worker-exit warning: **GONE**. No open handles detected. All 18 tests green.
