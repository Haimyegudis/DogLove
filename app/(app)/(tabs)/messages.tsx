import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font } from '../../../src/theme';

export default function Messages() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>הודעות 💬</Text>
        <Text style={styles.sub}>צ'אט עם בעלי כלבים אחרים יגיע בקרוב.</Text>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1, padding: 24, gap: 8 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center', marginTop: 12 },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors.inkCoolSoft, textAlign: 'center' },
});
