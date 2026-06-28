import { useEffect, useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/state/AuthContext';
import { getDiscoverable, setDiscoverable, deleteAccount } from '../../src/services/privacy';
import { colors, font, radius } from '../../src/theme';

const SHARED = [
  '👤 הפרופיל שלך (שם, תמונה, גיל, מגדר) גלוי בחיפוש ובהכרויות.',
  '🐕 פרופילי הכלבים שלך גלויים למשתמשים אחרים.',
  '📍 המיקום שלך משותף רק בזמן הליכה פעילה — ונפסק בסיומה.',
  '💬 הודעות גלויות רק למשתתפי השיחה.',
];

export default function Privacy() {
  const { session, signOut } = useAuth();
  const userId = session!.user.id;
  const [discoverable, setDisc] = useState(true);

  useEffect(() => { getDiscoverable().then(({ data }) => setDisc(data)); }, []);

  async function toggle(v: boolean) {
    setDisc(v);
    const { error } = await setDiscoverable(userId, v);
    if (error) { setDisc(!v); Alert.alert('שגיאה', error); }
  }

  function onDelete() {
    Alert.alert('מחיקת חשבון', 'הפעולה תמחק את החשבון וכל הנתונים לצמיתות. להמשיך?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק הכל', style: 'destructive', onPress: async () => {
        const { error } = await deleteAccount();
        if (error) { Alert.alert('שגיאה', error); return; }
        await signOut();
      } },
    ]);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>פרטיות 🔒</Text>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Switch value={discoverable} onValueChange={toggle} trackColor={{ true: colors.rose }} />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>הופעה בחיפוש ובהכרויות</Text>
                <Text style={styles.toggleSub}>כשמכובה, אחרים לא ימצאו אותך בחיפוש או בהכרויות.</Text>
              </View>
            </View>
          </View>

          <Text style={styles.section}>מה משותף?</Text>
          <View style={styles.card}>
            {SHARED.map((s, i) => <Text key={i} style={styles.sharedItem}>{s}</Text>)}
          </View>
          <Text style={styles.blockNote}>משתמשים שחסמת לא יראו אותך ולא יופיעו עבורך.</Text>

          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>מחיקת חשבון וכל הנתונים</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.lineCool },
  toggleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1 },
  toggleTitle: { fontFamily: font.bold, fontSize: 15, color: colors.brandDark, textAlign: 'right' },
  toggleSub: { fontFamily: font.regular, fontSize: 12, color: colors.inkCoolSoft, textAlign: 'right' },
  section: { fontFamily: font.black, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  sharedItem: { fontFamily: font.regular, fontSize: 14, lineHeight: 22, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  deleteBtn: { backgroundColor: '#FDECEC', borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#F3C9C9' },
  deleteText: { fontFamily: font.bold, color: colors.danger, fontSize: 15 },
  blockNote: { fontFamily: font.regular, fontSize: 12, color: colors.inkCoolSoft, textAlign: 'right', writingDirection: 'rtl' },
});
