import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import BrandLockup from '../../../src/components/BrandLockup';
import { supabase } from '../../../src/lib/supabase';
import { listIncoming } from '../../../src/services/match';
import { useI18n } from '../../../src/i18n/LanguageContext';
import { colors, font, radius, gradients } from '../../../src/theme';

function Stat({ n, label, tint, bg, icon, onPress }: { n: number; label: string; tint: string; bg: string; icon: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.stat, pressed && onPress && styles.pressed]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
      <Text style={[styles.statN, { color: tint }]}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
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
  const { t } = useI18n();
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
            <Text style={styles.heroPaws}>🐾</Text>
            <Text style={styles.heroPaws2}>🐾</Text>
            <Text style={styles.heroKicker}>שעת הזהב בפארק</Text>
            <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
            <Text style={styles.heroSub}>{t('home.heroSub')}</Text>
            <Pressable style={styles.heroBtn} onPress={() => router.push('/(app)/(tabs)/map')}>
              <Text style={styles.heroBtnText}>{t('home.heroBtn')}</Text>
            </Pressable>
          </LinearGradient>

          <View style={styles.statsRow}>
            <Stat n={walkers} label="מטיילים פעילים" tint={colors.green} bg={colors.greenSoft} icon="🐾" onPress={() => router.push('/(app)/active-walkers')} />
            <Stat n={dogs} label="כלבים בקהילה" tint={colors.purple} bg={colors.purpleSoft} icon="🐕" onPress={() => router.push('/(app)/browse')} />
            <Stat n={pending} label="בקשות ממתינות" tint={colors.rose} bg={colors.roseSoft} icon="❤️" onPress={() => router.push('/(app)/(tabs)/playdates')} />
          </View>

          <Text style={styles.section}>{t('home.section')}</Text>
          <View style={styles.grid}>
            <Feature title={t('card.map.title')} sub={t('card.map.sub')} bg={colors.greenSoft} icon="🗺️" onPress={() => router.push('/(app)/(tabs)/map')} />
            <Feature title={t('card.findFriend.title')} sub={t('card.findFriend.sub')} bg={colors.roseSoft} icon="❤️" onPress={() => router.push('/(app)/(tabs)/playdates')} />
            <Feature title={t('card.search.title')} sub={t('card.search.sub')} bg={colors.purpleSoft} icon="🔎" onPress={() => router.push('/(app)/search')} />
            <Feature title={t('card.calendar.title')} sub={t('card.calendar.sub')} bg={colors.purpleSoft} icon="📅" onPress={() => router.push('/(app)/calendar')} />
            <Feature title={t('card.gallery.title')} sub={t('card.gallery.sub')} bg={colors.purpleSoft} icon="📸" onPress={() => router.push('/(app)/feed')} />
            <Feature title={t('card.lostDog.title')} sub={t('card.lostDog.sub')} bg={colors.roseSoft} icon="🚨" onPress={() => router.push('/(app)/lost-dogs')} />
            <Feature title={t('card.socialWalks.title')} sub={t('card.socialWalks.sub')} bg={colors.greenSoft} icon="👥" onPress={() => router.push('/(app)/social-walks')} />
            <Feature title={t('card.walkers.title')} sub={t('card.walkers.sub')} bg={colors.greenSoft} icon="🦮" onPress={() => router.push('/(app)/walkers')} />
            <Feature title={t('card.walkStats.title')} sub={t('card.walkStats.sub')} bg={colors.purpleSoft} icon="📊" onPress={() => router.push('/(app)/walk-stats')} />
            <Feature title={t('card.challenges.title')} sub={t('card.challenges.sub')} bg={colors.greenSoft} icon="🏆" onPress={() => router.push('/(app)/challenges')} />
            <Feature title={t('card.badges.title')} sub={t('card.badges.sub')} bg={colors.roseSoft} icon="🏅" onPress={() => router.push('/(app)/badges')} />
            <Feature title={t('card.places.title')} sub={t('card.places.sub')} bg={colors.purpleSoft} icon="🏥" onPress={() => router.push('/(app)/places')} />
            <Feature title={t('card.premium.title')} sub={t('card.premium.sub')} bg={colors.roseSoft} icon="⭐" onPress={() => router.push('/(app)/premium')} />
            <Feature title="הכרויות" sub="הכר אנשים דרך הכלב" bg={colors.roseSoft} icon="💞" onPress={() => router.push('/(app)/discover-people')} />
            <Feature title="מי בפארק עכשיו" sub="צ׳ק-אין ומפגשים" bg={colors.greenSoft} icon="🌳" onPress={() => router.push('/(app)/park-checkins')} />
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

  hero: { borderRadius: 26, padding: 24, gap: 6, overflow: 'hidden' },
  heroPaws: { position: 'absolute', top: -10, left: -6, fontSize: 90, opacity: 0.14, transform: [{ rotate: '-18deg' }] },
  heroPaws2: { position: 'absolute', bottom: -18, left: 64, fontSize: 56, opacity: 0.12, transform: [{ rotate: '12deg' }] },
  heroKicker: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.85)', textAlign: 'right' },
  heroTitle: { fontFamily: font.display, fontSize: 27, lineHeight: 34, color: colors.white, textAlign: 'right' },
  heroSub: { fontFamily: font.medium, fontSize: 14, color: 'rgba(255,255,255,0.94)', textAlign: 'right', marginTop: 2 },
  heroBtn: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 20, marginTop: 12 },
  heroBtnText: { fontFamily: font.bold, color: colors.coralDeep, fontSize: 14 },

  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.lineCool },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statN: { fontFamily: font.black, fontSize: 22 },
  statLabel: { fontFamily: font.regular, fontSize: 11, color: colors.inkCoolSoft, textAlign: 'center' },

  section: { fontFamily: font.display, fontSize: 19, color: colors.brandDark, textAlign: 'right', marginTop: 4 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  feature: { width: '31%', aspectRatio: 1, backgroundColor: colors.white, borderRadius: 20, padding: 11, gap: 5, justifyContent: 'center', borderWidth: 1, borderColor: colors.lineCool },
  featureIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontFamily: font.bold, fontSize: 13, color: colors.brandDark, textAlign: 'right' },
  featureSub: { fontFamily: font.regular, fontSize: 10, lineHeight: 13, color: colors.inkCoolSoft, textAlign: 'right' },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
