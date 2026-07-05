import { useEffect, useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '../../src/state/AuthContext';
import { useI18n } from '../../src/i18n/LanguageContext';
import { getSettings, setDiscoverable, setShareHomeArea, stampHomeArea, deleteAccount } from '../../src/services/privacy';
import { getWalkerStatus, setWalker } from '../../src/services/walkers';
import { getCurrentCoords } from '../../src/services/location';
import { colors, font, radius } from '../../src/theme';

export default function Privacy() {
  const { session, signOut } = useAuth();
  const { lang, t, setLang } = useI18n();
  const userId = session!.user.id;
  const SHARED = [
    t('privacy.share1'),
    t('privacy.share2'),
    t('privacy.share3'),
    t('privacy.share4'),
  ];
  const [discoverable, setDisc] = useState(true);
  const [shareHome, setShareHome] = useState(false);
  const [isWalker, setIsWalker] = useState(false);

  useEffect(() => { getSettings().then(({ data }) => { setDisc(data.isDiscoverable); setShareHome(data.shareHomeArea); }); }, []);
  useEffect(() => { getWalkerStatus(userId).then(({ data }) => setIsWalker(data)); }, []);

  async function toggle(v: boolean) {
    setDisc(v);
    const { error } = await setDiscoverable(userId, v);
    if (error) { setDisc(!v); Alert.alert(t('privacy.error'), error); }
  }

  async function toggleShareHome(v: boolean) {
    setShareHome(v);
    const { error } = await setShareHomeArea(v);
    if (error) { setShareHome(!v); Alert.alert(t('privacy.error'), error); return; }
    // On opt-in, stamp the current home area so the nearby feed sort actually works.
    if (v) {
      const coords = await getCurrentCoords();
      if (coords) await stampHomeArea(coords.lat, coords.lng);
    }
  }

  async function toggleWalker(v: boolean) {
    setIsWalker(v);
    const { error } = await setWalker(userId, v);
    if (error) { setIsWalker(!v); Alert.alert(t('privacy.error'), error); }
  }

  function onDelete() {
    Alert.alert(t('privacy.deleteTitle'), t('privacy.deleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('privacy.deleteConfirm'), style: 'destructive', onPress: async () => {
        const { error } = await deleteAccount();
        if (error) { Alert.alert(t('privacy.error'), error); return; }
        await signOut();
      } },
    ]);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{t('privacy.title')}</Text>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Switch value={discoverable} onValueChange={toggle} trackColor={{ true: colors.rose }} />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>{t('privacy.discoverableTitle')}</Text>
                <Text style={styles.toggleSub}>{t('privacy.discoverableSub')}</Text>
              </View>
            </View>
            <View style={styles.toggleRow}>
              <Switch value={isWalker} onValueChange={toggleWalker} trackColor={{ true: colors.rose }} />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>{t('privacy.walkerTitle')}</Text>
                <Text style={styles.toggleSub}>{t('privacy.walkerSub')}</Text>
              </View>
            </View>
            <View style={styles.toggleRow}>
              <Switch value={shareHome} onValueChange={toggleShareHome} trackColor={{ true: colors.rose }} />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>{t('privacy.shareHomeTitle')}</Text>
                <Text style={styles.toggleSub}>{t('privacy.shareHomeSub')}</Text>
              </View>
            </View>
            <View style={styles.langRow}>
              <Text style={styles.langLabel}>{t('settings.language')}</Text>
              <View style={styles.langChips}>
                <Pressable
                  onPress={() => setLang('he')}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.langHe')}
                  style={[styles.langChip, lang === 'he' && styles.langChipActive]}
                >
                  <Text style={[styles.langChipText, lang === 'he' && styles.langChipTextActive]}>
                    {t('settings.langHe')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLang('en')}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.langEn')}
                  style={[styles.langChip, lang === 'en' && styles.langChipActive]}
                >
                  <Text style={[styles.langChipText, lang === 'en' && styles.langChipTextActive]}>
                    {t('settings.langEn')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.section}>{t('privacy.sharedTitle')}</Text>
          <View style={styles.card}>
            {SHARED.map((s, i) => <Text key={i} style={styles.sharedItem}>{s}</Text>)}
          </View>
          <Text style={styles.blockNote}>{t('privacy.blockNote')}</Text>

          <Text style={styles.section}>{t('privacy.legalTitle')}</Text>
          <View style={styles.card}>
            <Link href="/privacy-policy" asChild>
              <Pressable style={styles.legalRow} accessibilityRole="link" accessibilityLabel={t('privacy.privacyPolicyLink')}>
                <Text style={styles.legalText}>{t('privacy.privacyPolicyLink')}</Text>
              </Pressable>
            </Link>
            <Link href="/terms" asChild>
              <Pressable style={styles.legalRow} accessibilityRole="link" accessibilityLabel={t('privacy.termsLink')}>
                <Text style={styles.legalText}>{t('privacy.termsLink')}</Text>
              </Pressable>
            </Link>
          </View>

          <Pressable onPress={onDelete} style={styles.deleteBtn} accessibilityRole="button" accessibilityLabel={t('privacy.deleteAccount')}>
            <Text style={styles.deleteText}>{t('privacy.deleteAccount')}</Text>
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
  langRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  langLabel: { fontFamily: font.bold, fontSize: 15, color: colors.brandDark, textAlign: 'right' },
  langChips: { flexDirection: 'row', gap: 8 },
  langChip: { borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.lineCool, backgroundColor: colors.cream },
  langChipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  langChipText: { fontFamily: font.medium, fontSize: 13, color: colors.inkCoolSoft },
  langChipTextActive: { color: colors.white },
  legalRow: { paddingVertical: 10 },
  legalText: { fontFamily: font.bold, fontSize: 15, color: colors.purple, textAlign: 'right', writingDirection: 'rtl' },
});
