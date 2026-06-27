import { View, Text, Pressable, StyleSheet } from 'react-native';
import BrandLockup from '../../src/components/BrandLockup';
import { useAuth } from '../../src/state/AuthContext';

export default function Home() {
  const { session, signOut } = useAuth();
  return (
    <View style={styles.c}>
      <BrandLockup />
      <Text style={styles.hello}>ברוך הבא! 🐶</Text>
      <Text style={styles.sub} numberOfLines={1}>{session?.user.email ?? 'מחובר עם Google'}</Text>
      <Text style={styles.note}>המפה החיה תגיע בשלב הבא.</Text>
      <Pressable testID="signout-btn" style={styles.btn} onPress={signOut}>
        <Text style={styles.btnText}>התנתק</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 16 },
  hello: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 16, color: '#555' },
  note: { fontSize: 14, color: '#999' },
  btn: { backgroundColor: '#333', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginTop: 12 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
