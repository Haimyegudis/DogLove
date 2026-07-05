import { Text, Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BrandLockup from '../src/components/BrandLockup';
import DogParkBackground from '../src/components/DogParkBackground';
import { setDataNoticeSeen } from '../src/state/consent';
import { useI18n } from '../src/i18n/LanguageContext';
import { colors, font, radius, shadow } from '../src/theme';

const POINTS = [
  { icon: '👋', key: 'notice.point1' },
  { icon: '📍', key: 'notice.point2' },
  { icon: '🙈', key: 'notice.point3' },
  { icon: '🗑️', key: 'notice.point4' },
];

export default function Notice() {
  const router = useRouter();
  const { t } = useI18n();
  async function accept() {
    try { await setDataNoticeSeen(); } catch {}
    router.replace('/(auth)/login');
  }
  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.paw} accessibilityLabel={t('notice.title')}>🐾</Text>
            <BrandLockup size={40} />
            <Text style={styles.title}>{t('notice.title')}</Text>
          </View>

          <View style={[styles.card, shadow.card]}>
            {POINTS.map((p, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.rowIcon}>{p.icon}</Text>
                <Text style={styles.rowText}>{t(p.key)}</Text>
              </View>
            ))}
          </View>

          <Pressable
            testID="accept-notice"
            accessibilityRole="button"
            accessibilityLabel={t('notice.accept')}
            style={({ pressed }) => [styles.btn, shadow.soft, pressed && styles.pressed]}
            onPress={accept}
          >
            <Text style={styles.btnText}>{t('notice.accept')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 },
  hero: { alignItems: 'center', gap: 10 },
  paw: { fontSize: 34 },
  title: { fontFamily: font.bold, fontSize: 20, color: colors.bark, textAlign: 'center', marginTop: 4 },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
  rowIcon: { fontSize: 22, marginTop: 1 },
  rowText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  btn: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  btnText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
