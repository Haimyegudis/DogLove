import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Avatar from '../../src/components/Avatar';
import { listMyPlaydates, cancelPlaydate } from '../../src/services/playdates';
import type { PlaydateRow } from '../../src/types/playdate';
import { useI18n } from '../../src/i18n/LanguageContext';
import { colors, font, radius } from '../../src/theme';

const pad = (n: number) => String(n).padStart(2, '0');
function fmt(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Calendar() {
  const { t } = useI18n();
  const statusLabel: Record<string, string> = { scheduled: t('calendar.statusScheduled'), cancelled: t('calendar.statusCancelled'), completed: t('calendar.statusCompleted') };
  const [rows, setRows] = useState<PlaydateRow[]>([]);
  const load = useCallback(() => {
    listMyPlaydates().then(({ data, error }) => { if (error) { Alert.alert(t('calendar.error'), error); return; } setRows(data ?? []); });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onCancel(id: string) {
    Alert.alert(t('calendar.cancelConfirmTitle'), '', [
      { text: t('calendar.no'), style: 'cancel' },
      { text: t('calendar.cancelMeetup'), style: 'destructive', onPress: async () => { const { error } = await cancelPlaydate(id); if (error) { Alert.alert(t('calendar.error'), error); return; } load(); } },
    ]);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>{t('calendar.title')}</Text>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>{t('calendar.empty')}</Text>
          ) : rows.map((p) => (
            <View key={p.id} style={styles.card}>
              <Avatar uri={p.other_photo} fallback="🧑" size={48} />
              <View style={styles.info}>
                <Text style={styles.name}>{p.other_name ?? t('calendar.ownerFallback')}</Text>
                <Text style={styles.when}>{fmt(p.starts_at)}</Text>
                {p.location_name ? <Text style={styles.where}>📍 {p.location_name}</Text> : null}
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.status, p.status === 'cancelled' && styles.cancelled]}>{statusLabel[p.status] ?? p.status}</Text>
                {p.status === 'scheduled' ? (
                  <Pressable onPress={() => onCancel(p.id)} accessibilityRole="button" accessibilityLabel={t('calendar.cancelMeetup')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={styles.cancelBtn}>{t('calendar.cancelShort')}</Text></Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center', marginTop: 12 },
  scroll: { padding: 16, gap: 10 },
  empty: { fontFamily: font.regular, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 24 },
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.lineCool },
  info: { flex: 1 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  when: { fontFamily: font.medium, fontSize: 13, color: colors.purple, textAlign: 'right' },
  where: { fontFamily: font.regular, fontSize: 12, color: colors.inkCoolSoft, textAlign: 'right' },
  rightCol: { alignItems: 'center', gap: 4 },
  status: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  cancelled: { color: colors.inkCoolSoft },
  cancelBtn: { fontFamily: font.medium, fontSize: 12, color: colors.danger },
});
