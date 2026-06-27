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
      <Pressable testID="google-btn" disabled={busy} style={[styles.btn, styles.google]} onPress={onGoogle}>
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
