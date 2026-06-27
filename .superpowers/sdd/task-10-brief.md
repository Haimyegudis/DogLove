## Task 10: Login and sign-up screens

**Files:**
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`

**Interfaces:**
- Consumes: `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle` from `src/services/auth.ts`; `BrandLockup`.
- Produces: working auth screens. On success, the auth state change (Task 8) re-routes to home automatically.

- [ ] **Step 1: Add the auth group layout**

`app/(auth)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Implement the login screen**

`app/(auth)/login.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Link } from 'expo-router';
import BrandLockup from '../../src/components/BrandLockup';
import { signInWithEmail, signInWithGoogle } from '../../src/services/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onEmailLogin() {
    setBusy(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (error) Alert.alert('שגיאת התחברות', error);
  }
  async function onGoogle() {
    const { error } = await signInWithGoogle();
    if (error) Alert.alert('שגיאת התחברות', error);
  }

  return (
    <View style={styles.c}>
      <BrandLockup />
      <Pressable testID="google-btn" style={[styles.btn, styles.google]} onPress={onGoogle}>
        <Text style={styles.googleText}>התחבר עם Google</Text>
      </Pressable>
      <Text style={styles.or}>או</Text>
      <TextInput style={styles.input} placeholder="אימייל" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="סיסמה" secureTextEntry
        value={password} onChangeText={setPassword} />
      <Pressable testID="login-btn" disabled={busy} style={styles.btn} onPress={onEmailLogin}>
        <Text style={styles.btnText}>{busy ? '...' : 'התחבר'}</Text>
      </Pressable>
      <Link href="/(auth)/signup" style={styles.link}>אין לך חשבון? הרשם</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, fontSize: 16, textAlign: 'right' },
  btn: { backgroundColor: '#e0364f', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
  google: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  googleText: { color: '#333', fontSize: 16, fontWeight: '700' },
  or: { textAlign: 'center', color: '#888' },
  link: { textAlign: 'center', color: '#e0364f', marginTop: 8 },
});
```

- [ ] **Step 3: Implement the sign-up screen**

`app/(auth)/signup.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signUpWithEmail } from '../../src/services/auth';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSignup() {
    if (password.length < 6) { Alert.alert('סיסמה קצרה מדי', 'לפחות 6 תווים'); return; }
    setBusy(true);
    const { error } = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (error) { Alert.alert('הרשמה נכשלה', error); return; }
    Alert.alert('כמעט סיימנו', 'בדוק את האימייל לאישור, ואז התחבר.');
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.c}>
      <Text style={styles.title}>יצירת חשבון</Text>
      <TextInput style={styles.input} placeholder="אימייל" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="סיסמה (6+ תווים)" secureTextEntry
        value={password} onChangeText={setPassword} />
      <Pressable testID="signup-btn" disabled={busy} style={styles.btn} onPress={onSignup}>
        <Text style={styles.btnText}>{busy ? '...' : 'הרשם'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, fontSize: 16, textAlign: 'right' },
  btn: { backgroundColor: '#e0364f', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
});
```

- [ ] **Step 4: Verify on device**

Run: `npm start`. Expected: from the notice → login screen with a Google button, email/password fields, and a sign-up link. Create an email account, confirm via email, log in. Check the Supabase dashboard: a row appears in `auth.users` and a matching row in `profiles`.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)"
git commit -m "feat(auth): add login and sign-up screens"
```

---

