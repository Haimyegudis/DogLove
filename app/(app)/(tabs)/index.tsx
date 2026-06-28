import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import BrandLockup from '../../../src/components/BrandLockup';
import { supabase } from '../../../src/lib/supabase';
import { listIncoming } from '../../../src/services/match';
import { colors, font, radius, gradients } from '../../../src/theme';

function Stat({ n, label, tint, bg, icon }: { n: number; label: string; tint: string; bg: string; icon: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
      <Text style={[styles.statN, { color: tint }]}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Feature({ title, sub, bg, icon, onPress }: { title: string; sub: string; bg: string; icon: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.feature, pressed && styles.pressed]}>
      <View style={[styles.featureIcon, { backgroundColor: bg }]}><Text style={{ fontSize: 22 }}>{icon}</Text></View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSub}>{sub}</Text>
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const [walkers, setWalkers] = useState(0);
  const [dogs, setDogs] = useState(0);
  const [pending, setPending] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const w = await supabase.from('walk_sessions').select('id', { count: 'exact', head: true }).eq('is_active', true);
      const d = await supabase.from('dogs').select('id', { count: 'exact', head: true });
      const inc = await listIncoming();
      if (!active) return;
      setWalkers(w.count ?? 0);
      setDogs(d.count ?? 0);
      setPending((inc.data || []).filter((r) => r.status === 'pending').length);
    })();
    return () => { active = false; };
  }, []));

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <BrandLockup size={28} />
            <View style={styles.avatar}><Text style={{ fontSize: 18 }}>🐶</Text></View>
          </View>

          <LinearGradient colors={gradients.hero as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroTitle}>היי, חבר הכלבים! 🐾</Text>
            <Text style={styles.heroSub}>בוא נמצא חברים חדשים ועוד הרפתקאות בשכונה</Text>
            <Pressable style={styles.heroBtn} onPress={() => router.push('/(app)/(tabs)/map')}>
              <Text style={styles.heroBtnText}>גלה הרפתקאות חדשות! 🦮</Text>
            </Pressable>
          </LinearGradient>

          <View style={styles.statsRow}>
            <Stat n={walkers} label="מטיילים פעילים" tint={colors.green} bg={colors.greenSoft} icon="🐾" />
            <Stat n={dogs} label="כלבים בקהילה" tint={colors.purple} bg={colors.purpleSoft} icon="🐕" />
            <Stat n={pending} label="בקשות ממתינות" tint={colors.rose} bg={colors.roseSoft} icon="❤️" />
          </View>

          <Text style={styles.section}>קיצורי דרך ✨</Text>
          <View style={styles.grid}>
            <Feature title="צא לטיול" sub="כלבים פעילים על המפה" bg={colors.greenSoft} icon="🗺️" onPress={() => router.push('/(app)/(tabs)/map')} />
            <Feature title="מצא חבר" sub="בקשות משחק לכלב שלך" bg={colors.roseSoft} icon="❤️" onPress={() => router.push('/(app)/(tabs)/playdates')} />
            <Feature title="חיפוש" sub="כלבים לפי סוג, בעלים" bg={colors.purpleSoft} icon="🔎" onPress={() => router.push('/(app)/search')} />
            <Feature title="יומן" sub="מפגשים מתוכננים" bg={colors.purpleSoft} icon="📅" onPress={() => router.push('/(app)/calendar')} />
            <Feature title="גלריה" sub="תמונות של כלבים" bg={colors.purpleSoft} icon="📸" onPress={() => router.push('/(app)/feed')} />
            <Feature title="כלב נעדר" sub="התראות בקהילה" bg={colors.roseSoft} icon="🚨" onPress={() => router.push('/(app)/lost-dogs')} />
            <Feature title="טיולים קבוצתיים" sub="להיפגש בפארק" bg={colors.greenSoft} icon="👥" onPress={() => router.push('/(app)/social-walks')} />
            <Feature title="מטיילי כלבים" sub="מי יוציא את הכלב" bg={colors.greenSoft} icon="🦮" onPress={() => router.push('/(app)/walkers')} />
            <Feature title="הסטטיסטיקה שלי" sub="טיולים ורצף" bg={colors.purpleSoft} icon="📊" onPress={() => router.push('/(app)/walk-stats')} />
            <Feature title="אתגרי כושר" sub="התחרו בקהילה" bg={colors.greenSoft} icon="🏆" onPress={() => router.push('/(app)/challenges')} />
            <Feature title="ההישגים שלי" sub="תגים ומדליות" bg={colors.roseSoft} icon="🏅" onPress={() => router.push('/(app)/badges')} />
            <Feature title="שירותים קרובים" sub="וטרינר, גינות" bg={colors.purpleSoft} icon="🏥" onPress={() => router.push('/(app)/places')} />
            <Feature title="Premium" sub="שדרג את החוויה" bg={colors.roseSoft} icon="⭐" onPress={() => router.push('/(app)/premium')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  scroll: { padding: 18, gap: 16 },
  topbar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },

  hero: { borderRadius: 24, padding: 22, gap: 8 },
  heroTitle: { fontFamily: font.black, fontSize: 22, color: colors.white, textAlign: 'right' },
  heroSub: { fontFamily: font.medium, fontSize: 14, color: 'rgba(255,255,255,0.92)', textAlign: 'right' },
  heroBtn: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18, marginTop: 8 },
  heroBtnText: { fontFamily: font.bold, color: colors.purple, fontSize: 14 },

  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.lineCool },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statN: { fontFamily: font.black, fontSize: 22 },
  statLabel: { fontFamily: font.regular, fontSize: 11, color: colors.inkCoolSoft, textAlign: 'center' },

  section: { fontFamily: font.black, fontSize: 17, color: colors.brandDark, textAlign: 'right', marginTop: 4 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  feature: { width: '31%', aspectRatio: 1, backgroundColor: colors.white, borderRadius: 20, padding: 11, gap: 5, justifyContent: 'center', borderWidth: 1, borderColor: colors.lineCool },
  featureIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontFamily: font.bold, fontSize: 13, color: colors.brandDark, textAlign: 'right' },
  featureSub: { fontFamily: font.regular, fontSize: 10, lineHeight: 13, color: colors.inkCoolSoft, textAlign: 'right' },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
