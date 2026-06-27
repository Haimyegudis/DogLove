# Task 1 Report: Initialize Expo TypeScript project + tooling

## Status: DONE_WITH_CONCERNS

## What Was Implemented

All 9 files from the Task 1 brief were created:
- `package.json` — Expo 56, React 19, scripts with `expo-router/entry` as main
- `tsconfig.json` — extends expo/tsconfig.base, strict: true, types: ["jest"]
- `app.config.ts` — name כלב LOVE, slug doglove, scheme doglove, android package, dotenv, supabase env injection
- `.gitignore` — node_modules, .env, .expo/, dist/, web-build/, *.log
- `.env.example` — SUPABASE_URL and SUPABASE_ANON_KEY stubs
- `jest.config.js` — preset jest-expo, setupFilesAfterEnv, transformIgnorePatterns
- `app/_layout.tsx` — Stack from expo-router, headerShown: false
- `app/index.tsx` — View + Text "כלב LOVE", centered
- `__tests__/smoke.test.ts` — `test('jest runs', () => expect(1+1).toBe(2))`

Assets from the Expo template were also included (icon.png, splash-icon.png, android icons, favicon.png).

## Commands Run + Outputs

### Scaffolding approach
`create-expo-app@latest _scaffold --template expo-template-blank-typescript --no-install` ran but hung on interactive git prompt after extracting files. Stopped the task after extracting the needed data (package versions, tsconfig template, asset files). All project files were created manually from the brief spec and scaffold metadata.

### Dependency installs
```
npm install                            # base Expo 56 + React 19 (466 packages)
npm install -D dotenv                  # needed by app.config.ts before expo install
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants @react-native-async-storage/async-storage react-native-url-polyfill
npm install @supabase/supabase-js --legacy-peer-deps
npm install -D jest jest-expo @testing-library/react-native @types/jest @testing-library/jest-native --legacy-peer-deps
npm install -D @react-native/jest-preset --legacy-peer-deps   # peer dep required by jest-expo 56
npm install -D "jest@^29" "@types/jest@^29" --legacy-peer-deps  # jest 30 incompatible with jest-expo 56
```

### Export verification (substitute for QR scan)
```
npx expo export --platform android
→ android bundles (1): _expo/static/js/android/entry-ca21d4168c60f8ad87ee29d0e8cb2129.hbc (2.7MB)
→ Exported: dist
```
dist/ was deleted after verification (not committed).

## TDD Evidence: Smoke Test

### RED Phase (before deps installed)
```
> doglove@1.0.0 test
> jest __tests__/smoke.test.ts
'jest' is not recognized as an internal or external command
```
Exit code: 1

### GREEN Phase (after all deps installed)
```
PASS __tests__/smoke.test.ts
  ✓ jest runs (2 ms)
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```
Exit code: 0

## TypeScript Check
```
npx tsc --noEmit → (no output, clean)
```

## Files Changed

New files created:
- `.env.example`
- `.gitignore`
- `__tests__/smoke.test.ts`
- `app.config.ts`
- `app/_layout.tsx`
- `app/index.tsx`
- `assets/android-icon-background.png`
- `assets/android-icon-foreground.png`
- `assets/android-icon-monochrome.png`
- `assets/favicon.png`
- `assets/icon.png`
- `assets/splash-icon.png`
- `jest.config.js`
- `package-lock.json`
- `package.json`
- `tsconfig.json`

Existing files preserved: `TECHNICAL_REQUIREMENTS.md`, `docs/`, `.superpowers/`, `.git/`

## Self-Review Findings

### Completeness
All 9 files from the brief's File Structure are present. The `assets/` folder was added (required by Expo's app.config.ts icon references).

### Quality
- `app.config.ts` matches brief verbatim (name, slug, scheme, android package, dotenv, supabase extras)
- `jest.config.js` matches brief verbatim
- `app/_layout.tsx` and `app/index.tsx` match brief verbatim
- `tsconfig.json` has an extra `"types": ["jest"]` field vs the minimal brief version — this was required to make `npx tsc --noEmit` pass (otherwise tsc couldn't find `test`/`expect` globals)

### Discipline
No auth code, no UI components beyond the minimal index screen. Strictly Task 1 scope.

### Testing
Smoke test runs clean (1 pass, no warnings). TypeScript compiles clean.

## Concerns / Deviations

1. **jest version pinned to ^29** — The brief's install command `npm install -D jest` pulls jest 30 (latest), but jest-expo 56 internally ships jest 29 internals. Jest 30 causes `clearMocksOnScope` TypeError. Installed `jest@^29` to match. This is a valid ecosystem compatibility issue, not a spec violation.

2. **`--legacy-peer-deps` required** — @supabase/supabase-js and some testing packages had peer-dep conflicts under npm 11. Used `--legacy-peer-deps` to resolve. This is standard for React Native ecosystems.

3. **`@react-native/jest-preset` extra install** — jest-expo 56 peer-requires this package (moved from react-native core). The brief's install command didn't include it, but it's required for jest-expo to initialize. Added it.

4. **`tsconfig.json` has `"types": ["jest"]`** — Brief shows minimal tsconfig. Added jest types to pass `npx tsc --noEmit`. Without it, tsc errors on `test`/`expect` globals.

5. **`create-expo-app` non-interactive limitation** — The scaffold command hung on the "Skip initializing a new git repository?" prompt (cannot use `--no-git` flag with this version). Files were created manually from the brief spec + scaffold metadata. All outputs are identical to what the template would have produced.

6. **On-device QR test deferred** — As instructed, verified with `npx expo export --platform android` instead. Human QA owner must scan QR code on device.

## Commit

SHA: df2dcc8
Message: "chore: scaffold Expo TypeScript app with router, jest, env config"
Branch: feat/plan-01-foundation-auth

## Fix: tsconfig types

### Problem
`tsconfig.json` contained `"types": ["jest"]` in compilerOptions, which restricts TypeScript to ONLY load `@types/jest`, suppressing all other ambient types (react, react-native, node) needed for future tasks.

### Solution Applied
1. Removed `"types": ["jest"]` from tsconfig.json compilerOptions
2. Created `globals.d.ts` with triple-slash jest type reference
3. Verified both TypeScript and Jest still work cleanly

### Commands Run + Output

**npx tsc --noEmit:**
```
(no output — clean, no errors)
```
Exit code: 0

**npm test:**
```
> doglove@1.0.0 test
> jest

PASS __tests__/smoke.test.ts
  √ jest runs (2 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        1.39 s
Ran all test suites.
```
Exit code: 0

### Files Changed
- `tsconfig.json` — removed `"types": ["jest"]` from compilerOptions
- `globals.d.ts` — created with `/// <reference types="jest" />`

### Commit
SHA: 61af7a6
Message: "fix: replace tsconfig types array with globals.d.ts jest reference"
