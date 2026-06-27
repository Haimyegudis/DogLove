# Task 8 Report: Auth context + RTL root layout + routing

## Status: DONE

## TDD Evidence

### RED (Step 2)
Ran `npm test -- __tests__/AuthContext.test.tsx` before creating `src/state/AuthContext.tsx`.
Result: **FAIL** — `Cannot find module '../src/state/AuthContext' from '__tests__/AuthContext.test.tsx'`

### GREEN (Step 4)
After implementing `src/state/AuthContext.tsx`, ran same test.
Result: **PASS** — `loads session and exposes signed-in state (341 ms)`

## tsc --noEmit
Clean — zero errors or warnings.

## Full Test Suite (npm test)
```
Test Suites: 7 passed, 7 total
Tests:       12 passed, 12 total
```
All green. Pre-existing "worker process has failed to exit gracefully" warning was present before this task (from supabase/open-handle leak in earlier tasks).

## Files Changed
- **Created**: `src/state/AuthContext.tsx` — `AuthProvider` + `useAuth()` returning `{ session, loading, signOut }`
- **Created**: `__tests__/AuthContext.test.tsx` — TDD test (with one deviation from brief, see concerns)
- **Modified**: `app/_layout.tsx` — added I18nManager RTL forcing + wrapped in `AuthProvider`
- **Modified**: `app/index.tsx` — consent+auth routing: notice → login → home

## Concerns

### 1. `await render(...)` deviation from brief
The brief specifies verbatim:
```tsx
const { getByText } = render(<AuthProvider><Probe /></AuthProvider>);
```
However, `@testing-library/react-native@14.0.1` (the installed version) changed `render()` to be **async** (returns a `Promise`). Destructuring synchronously yields `undefined` for `getByText`, causing `getByText is not a function`.

Fix applied: changed to `const { getByText } = await render(...)`. This is the minimal, semantically correct adaptation for RNTL 14. The test still exercises the same contract.

### 2. act() warnings (resolved by fix above)
Before the `await` fix, React 19 emitted "testing environment is not configured to support act()" warnings because state updates in the AuthContext useEffect were occurring outside act. The `await render()` fix (which wraps initial render in act internally) resolved these.

### 3. RTL forcing under Jest
`I18nManager.forceRTL(true)` is called at module load time in `app/_layout.tsx`. Under Jest, this call goes into the React Native mock and has no side effects on test runner behavior. The RTL state is not verified by tests in this task (RTL behavior is a device-level concern for Expo). No act() warnings from this code path.

### 4. Pre-existing worker leak
`npm test` reports: "A worker process has failed to exit gracefully and has been force exited." This predates Task 8 — it appears in the full suite before and after our changes, likely from open handles in the Supabase client (Task 4) or async-storage mocks.

## Commit
SHA: `634a3ab`
Message: `feat(auth): add auth context, RTL root layout, and routing`
Branch: `feat/plan-01-foundation-auth`
