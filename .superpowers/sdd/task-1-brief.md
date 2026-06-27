## Task 1: Initialize Expo TypeScript project + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `app.config.ts`, `.gitignore`, `.env.example`, `jest.config.js`, `app/index.tsx`, `app/_layout.tsx`
- Test: `__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a runnable Expo Router app and a working Jest setup that later tasks extend.

- [ ] **Step 1: Scaffold the Expo app (TypeScript, Expo Router)**

Run in `C:\Apps\DogLove`:
```bash
npx create-expo-app@latest . --template expo-template-blank-typescript
```
If the directory-not-empty prompt appears, choose to continue (the repo already has `TECHNICAL_REQUIREMENTS.md` and `docs/`). Then add navigation + libs:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants @react-native-async-storage/async-storage react-native-url-polyfill
npm install @supabase/supabase-js
npm install -D jest jest-expo @testing-library/react-native @types/jest @testing-library/jest-native
```

- [ ] **Step 2: Configure Expo Router entry + scripts**

In `package.json` set the entry and scripts:
```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Step 3: Add `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*))',
  ],
};
```

- [ ] **Step 4: Create `app.config.ts` with name, RTL, and env injection**

```ts
import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'כלב LOVE',
  slug: 'doglove',
  scheme: 'doglove',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: {
    package: 'com.doglove.app',
  },
  plugins: ['expo-router'],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  },
};

export default config;
```
Install dotenv for config loading:
```bash
npm install -D dotenv
```

- [ ] **Step 5: Create `.gitignore` and `.env.example`**

`.gitignore`:
```
node_modules/
.env
.expo/
dist/
web-build/
*.log
```
`.env.example`:
```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 6: Minimal root layout and index so the app boots**

`app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```
`app/index.tsx`:
```tsx
import { Text, View } from 'react-native';
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>כלב LOVE</Text>
    </View>
  );
}
```

- [ ] **Step 7: Write a smoke test**

`__tests__/smoke.test.ts`:
```ts
test('jest runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 8: Run the smoke test**

Run: `npm test -- __tests__/smoke.test.ts`
Expected: PASS (1 test passed).

- [ ] **Step 9: Verify the app boots on your phone**

Run: `npm start`
On your phone: open **Expo Go**, scan the QR code. Expected: a white screen showing "כלב LOVE". (This is the Slice 0 acceptance: app launches on the QA owner's phone.)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo TypeScript app with router, jest, env config"
```

---

