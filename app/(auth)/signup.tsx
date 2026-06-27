import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signUpWithEmail } from '../../src/services/auth';
import { isAdult } from '../../src/lib/age';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birth, setBirth] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSignup() {
    if (password.length < 6) { Alert.alert('סיסמה קצרה מדי', 'לפחות 6 תווים'); return; }
    if (!isAdult(birth, new Date())) {
      Alert.alert('הרשמה נכשלה', 'עליך להיות בן 18 ומעלה כדי להירשם');
      return;
    }
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
      <TextInput style={styles.input} placeholder="תאריך לידה (YYYY-MM-DD)"
        value={birth} onChangeText={setBirth} textAlign="right" />
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
