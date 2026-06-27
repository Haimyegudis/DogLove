# Task 10 Report: Login and Sign-Up Screens with 18+ Age Gate

## What Was Built

### Core brief deliverables
- `app/(auth)/_layout.tsx` — Expo Router auth group layout (Stack, no header), verbatim from brief.
- `app/(auth)/login.tsx` — Login screen with Google SSO, email/password fields, link to sign-up, verbatim from brief.
- `app/(auth)/signup.tsx` — Sign-up screen from brief, **extended** with DOB field and 18+ age gate (see below).

### Additional spec v1.2: 18+ age gate
- `src/lib/age.ts` — Pure helper `export function isAdult(birthISO: string, now: Date): boolean`. Uses UTC date arithmetic to correctly handle the exact-birthday boundary (age >= 18 on the 18th birthday returns true). Invalid/empty strings return false.
- `__tests__/age.test.ts` — TDD test file with all 6 specified cases.
- `app/(auth)/signup.tsx` — Added `birth` state, text input with placeholder `תאריך לידה (YYYY-MM-DD)`, RTL-aligned. In `onSignup`, before calling `signUpWithEmail`, validates `isAdult(birth, new Date())`; if false, shows `Alert.alert('הרשמה נכשלה', 'עליך להיות בן 18 ומעלה כדי להירשם')` and returns without creating the account.

## TDD Evidence: isAdult RED → GREEN

### RED (module not found)
```
FAIL __tests__/age.test.ts
  ● Test suite failed to run
    Cannot find module '../src/lib/age' from '__tests__/age.test.ts'
Test Suites: 1 failed, 1 total  |  Tests: 0 total
```

### GREEN (all 6 pass after implementation)
```
PASS __tests__/age.test.ts
  isAdult
    ✓ born 2008-06-27 → exactly 18 today → true (3 ms)
    ✓ born 2008-06-28 → turns 18 tomorrow, still 17 → false
    ✓ born 2000-01-01 → true
    ✓ born 2010-01-01 → false (2 ms)
    ✓ empty string → false
    ✓ not-a-date → false (1 ms)
Test Suites: 1 passed, 1 total  |  Tests: 6 passed, 6 total
```

Key boundary logic: uses UTC year/month/day; subtracts 1 from age if this year's birthday hasn't occurred yet (month or day not yet reached).

## tsc Result
`npx tsc --noEmit` — no output, exit 0. Clean.

## Full Test Suite Result
```
PASS __tests__/age.test.ts
PASS __tests__/auth.test.ts
PASS __tests__/profile.test.ts
PASS __tests__/supabase.test.ts
PASS __tests__/AuthContext.test.tsx
PASS __tests__/consent.test.ts
PASS __tests__/smoke.test.ts
PASS __tests__/BrandLockup.test.tsx

Test Suites: 8 passed, 8 total
Tests:       18 passed, 18 total
```

Note: one worker-process-force-exit warning appeared — this is a pre-existing teardown leak in earlier tasks (likely the Supabase realtime subscription), not introduced by this task.

## Files Changed
- Created: `src/lib/age.ts`
- Created: `__tests__/age.test.ts`
- Created: `app/(auth)/_layout.tsx`
- Created: `app/(auth)/login.tsx`
- Created: `app/(auth)/signup.tsx`

## Commit
SHA: `e1172df`  
Branch: `feat/plan-01-foundation-auth`  
Message: `feat(auth): add login and sign-up screens with 18+ age gate`

## Concerns
- The worker teardown warning (`A worker process has failed to exit gracefully`) pre-exists; recommend investigating Supabase realtime subscription teardown in earlier test suites.
- `signup.tsx` uses a plain text input for DOB — sufficient for the gate per spec; a date-picker UI component can be added in a future task if desired.
- Device smoke-test (Step 4 of brief) not run — requires Expo dev server + physical device/emulator; manual QA required before shipping.

## Fix: review findings (tasks 9-11)

### tsc Result
```
(no output, exit 0)
```
Clean TypeScript compilation.

### Full Test Suite Result
```
PASS __tests__/age.test.ts
PASS __tests__/consent.test.ts
PASS __tests__/profile.test.ts
PASS __tests__/auth.test.ts
PASS __tests__/smoke.test.ts
PASS __tests__/supabase.test.ts
PASS __tests__/AuthContext.test.tsx
PASS __tests__/BrandLockup.test.tsx

Test Suites: 8 passed, 8 total
Tests:       18 passed, 18 total
```

All 18 tests passing. Pre-existing worker-process-force-exit warning remains (not introduced by review fixes).

### Signup Handler Validation Order
The updated `app/(auth)/signup.tsx` `onSignup()` checks in this order:
1. Password length >= 6 (existing)
2. DOB field not blank (Fix B)
3. DOB format YYYY-MM-DD (Fix C)
4. Age gate with UTC-normalized "today" (Fix A)
5. Call `signUpWithEmail()`

UTC normalization uses:
```ts
const now = new Date();
const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
```

### Fixes Applied
- **Fix A**: UTC-normalize `now` at age-gate call site (signup.tsx)
- **Fix B**: Explicit empty-DOB message before age check (signup.tsx)
- **Fix C**: DOB format guard YYYY-MM-DD validation (signup.tsx)
- **Fix D**: Google button busy state in login.tsx
- **Fix E**: Async error safety try/catch in notice.tsx
- **Fix F**: Email text overflow protection (numberOfLines={1}) in home.tsx

### Commit
```
SHA: e7e1c0bd2c511c507347788648e54edbd3251073
Subject: fix(auth): UTC-normalize age gate, required/format DOB validation, busy + safety fixes
Branch: feat/plan-01-foundation-auth
```
