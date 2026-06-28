import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, gradients, radius, shadow } from '../../src/theme';
import { amIPremium, setPremium } from '../../src/services/premium';

const PERKS = [
  { icon: '📍', text: 'רדיוס גילוי מורחב — מצא כלבים רחוק יותר' },
  { icon: '❤️', text: 'ראה מי אהב את הכלב שלך' },
  { icon: '📸', text: 'העלאת תמונות ללא הגבלה' },
  { icon: '⭐', text: 'תג Premium בולט על הפרופיל שלך' },
];

export default function Premium() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await amIPremium();
    setIsPremium(data);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleToggle() {
    if (isPremium === null) return;
    const next = !isPremium;
    const confirmMsg = next
      ? 'שדרג לפרימיום כעת? (ללא עלות במצב הדגמה)'
      : 'לבטל את המנוי הפרימיום?';
    Alert.alert(next ? 'שדרוג לפרימיום' : 'ביטול מנוי', confirmMsg, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: next ? 'שדרג' : 'בטל מנוי',
        style: next ? 'default' : 'destructive',
        onPress: async () => {
          setLoading(true);
          const { error } = await setPremium(next);
          setLoading(false);
          if (error) {
            Alert.alert('שגיאה', error);
            return;
          }
          setIsPremium(next);
        },
      },
    ]);
  }

  const statusReady = isPremium !== null;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero gradient header */}
          <LinearGradient colors={gradients.hero} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.heroIcon}>⭐</Text>
            <Text style={styles.heroTitle}>כלב LOVE Premium</Text>
            <Text style={styles.heroSub}>חווית האפליקציה הטובה ביותר לך ולכלבך</Text>
          </LinearGradient>

          {/* Current status pill */}
          {statusReady && (
            <View style={[styles.statusPill, isPremium ? styles.statusPremium : styles.statusFree]}>
              <Text style={[styles.statusText, isPremium ? styles.statusTextPremium : styles.statusTextFree]}>
                {isPremium ? '⭐ אתה משתמש פרימיום' : '🐾 מצב חינמי כרגע'}
              </Text>
            </View>
          )}

          {/* Perks list */}
          <Text style={styles.section}>יתרונות Premium</Text>
          <View style={styles.card}>
            {PERKS.map((perk, i) => (
              <View key={i} style={styles.perkRow}>
                <Text style={styles.perkIcon}>{perk.icon}</Text>
                <Text style={styles.perkText}>{perk.text}</Text>
                <Text style={styles.checkIcon}>✓</Text>
              </View>
            ))}
          </View>

          {/* Action button */}
          {statusReady && (
            <Pressable
              onPress={handleToggle}
              disabled={loading}
              style={({ pressed }) => [
                styles.actionBtn,
                isPremium ? styles.actionBtnDowngrade : styles.actionBtnUpgrade,
                pressed && styles.actionBtnPressed,
              ]}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : (
                  <Text style={[styles.actionBtnText, isPremium && styles.actionBtnTextDowngrade]}>
                    {isPremium ? 'בטל מנוי' : 'שדרג עכשיו ⭐'}
                  </Text>
                )
              }
            </Pressable>
          )}

          <Text style={styles.disclaimer}>
            זהו מצב הדגמה — לא מתבצע חיוב אמיתי.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  scroll: { padding: 18, gap: 16, paddingBottom: 40 },

  // Hero
  hero: {
    borderRadius: radius.lg,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    ...shadow.soft,
  },
  heroIcon: { fontSize: 48 },
  heroTitle: { fontFamily: font.black, fontSize: 26, color: colors.white, textAlign: 'center' },
  heroSub: { fontFamily: font.regular, fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  // Status
  statusPill: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPremium: { backgroundColor: '#FFF8E1', borderColor: '#F9C74F' },
  statusFree: { backgroundColor: colors.purpleSoft, borderColor: colors.purple },
  statusText: { fontFamily: font.bold, fontSize: 14 },
  statusTextPremium: { color: '#B7860B' },
  statusTextFree: { color: colors.purple },

  // Perks
  section: { fontFamily: font.black, fontSize: 17, color: colors.brandDark, textAlign: 'right' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.lineCool,
    ...shadow.card,
  },
  perkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  perkIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  perkText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.inkCool, textAlign: 'right' },
  checkIcon: { fontFamily: font.bold, fontSize: 16, color: colors.green, width: 22, textAlign: 'center' },

  // Action button
  actionBtn: {
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow.soft,
  },
  actionBtnUpgrade: { backgroundColor: colors.purple },
  actionBtnDowngrade: { backgroundColor: colors.bgApp, borderWidth: 1.5, borderColor: colors.danger },
  actionBtnPressed: { opacity: 0.8 },
  actionBtnText: { fontFamily: font.bold, fontSize: 17, color: colors.white },
  actionBtnTextDowngrade: { color: colors.danger },

  disclaimer: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.inkCoolSoft,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
