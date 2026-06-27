import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import BrandLockup from '../src/components/BrandLockup';
import { setDataNoticeSeen } from '../src/state/consent';

export default function Notice() {
  const router = useRouter();
  async function accept() {
    await setDataNoticeSeen();
    router.replace('/(auth)/login');
  }
  return (
    <View style={styles.container}>
      <BrandLockup />
      <Text style={styles.title}>איך אנחנו שומרים על הפרטיות שלך</Text>
      <Text style={styles.body}>
        • החשבון והפרופיל שלך משמשים לחיבור עם בעלי כלבים אחרים.{'\n'}
        • המיקום שלך משותף רק כשאתה בהליכה פעילה — וברגע שתסיים, הוא מפסיק.{'\n'}
        • לעולם לא נעקוב אחריך ברקע.{'\n'}
        • תוכל למחוק את החשבון והנתונים בכל עת.
      </Text>
      <Pressable testID="accept-notice" style={styles.btn} onPress={accept}>
        <Text style={styles.btnText}>הבנתי, בוא נתחיל</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 20 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'right' },
  body: { fontSize: 16, lineHeight: 26, textAlign: 'right' },
  btn: { backgroundColor: '#e0364f', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
});
