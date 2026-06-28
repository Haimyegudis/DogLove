import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Avatar from '../../src/components/Avatar';
import { discoverOwners, swipeOwner, type DiscoverOwner } from '../../src/services/dating';
import { GENDER_OPTIONS } from '../../src/types/profile';
import { colors, font, radius, shadow } from '../../src/theme';

const INTENT_LABEL: Record<string, string> = { friends: 'חברים 🐾', dates: 'דייטים ❤️', walks: 'טיולים 🦮' };
const genderLabel = (g: string | null) => GENDER_OPTIONS.find((o) => o.value === g)?.label ?? '';

const PAGE = 30;
const LOW_WATER = 3; // fetch more when this few remain

export default function DiscoverPeople() {
  const router = useRouter();
  const [deck, setDeck] = useState<DiscoverOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false); // server returned no more candidates

  const load = useCallback(async (replace: boolean) => {
    const { data, error } = await discoverOwners(PAGE);
    if (error) { Alert.alert('שגיאה', error); setLoading(false); return; }
    if (data.length === 0) setDone(true);
    setDeck((prev) => {
      if (replace) return data;
      const seen = new Set(prev.map((d) => d.user_id));
      return [...prev, ...data.filter((d) => !seen.has(d.user_id))];
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(true); }, [load]);

  const current = deck[0] ?? null;

  function advance() {
    setDeck((prev) => {
      const next = prev.slice(1);
      if (!done && next.length <= LOW_WATER) load(false);
      return next;
    });
  }

  async function onSwipe(like: boolean) {
    if (!current || busy) return;
    setBusy(true);
    const target = current;
    const { data, error } = await swipeOwner(target.user_id, like);
    setBusy(false);
    if (error) { Alert.alert('שגיאה', error); return; }
    advance();
    if (like && data?.matched && data.conversation_id) {
      const convId = data.conversation_id;
      Alert.alert('יש התאמה! 🎉', `אתם והכלבים מחכים להיכרות עם ${target.display_name ?? 'בעל הכלב'}`, [
        { text: 'אחר כך', style: 'cancel' },
        {
          text: 'פתח צ׳אט 💬',
          onPress: () => router.push(`/(app)/chat/${convId}?name=${encodeURIComponent(target.display_name ?? 'התאמה')}`),
        },
      ]);
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'הכרויות 💞' }} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.rose} /></View>
      ) : !current ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🐶💔</Text>
          <Text style={styles.emptyTitle}>אין כרגע פרופילים חדשים</Text>
          <Text style={styles.emptyText}>נסו שוב מאוחר יותר — חברים חדשים מצטרפים כל הזמן.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, shadow.card]}>
            <Avatar uri={current.photo_url} fallback="🧑" size={140} />
            <Text style={styles.name}>{current.display_name ?? 'בעל כלב'}</Text>
            <Text style={styles.meta}>
              {current.age ? `${current.age}` : ''}
              {current.gender ? ` · ${genderLabel(current.gender)}` : ''}
              {current.city ? ` · ${current.city}` : ''}
            </Text>

            {current.intent && current.intent.length > 0 ? (
              <View style={styles.intentRow}>
                {current.intent.map((i) => (
                  <Text key={i} style={styles.intentTag}>{INTENT_LABEL[i] ?? i}</Text>
                ))}
              </View>
            ) : null}

            {current.top_dog_name || current.top_dog_photo ? (
              <View style={styles.dogRow}>
                <Avatar uri={current.top_dog_photo} fallback="🐶" size={48} />
                <View style={styles.dogText}>
                  <Text style={styles.dogLabel}>הכלב/ה שלי</Text>
                  <Text style={styles.dogName}>{current.top_dog_name ?? 'כלב חמוד'} 🐾</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.skipBtn]}
              disabled={busy}
              onPress={() => onSwipe(false)}
            >
              <Text style={styles.skipEmoji}>❌</Text>
              <Text style={styles.skipLabel}>דלג</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.likeBtn]}
              disabled={busy}
              onPress={() => onSwipe(true)}
            >
              <Text style={styles.likeEmoji}>❤️</Text>
              <Text style={styles.likeLabel}>לייק</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  scroll: { padding: 18, gap: 18, alignItems: 'stretch' },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: 22, gap: 8,
    alignItems: 'center', borderWidth: 1, borderColor: colors.lineCool,
  },
  name: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center' },
  meta: { fontFamily: font.medium, fontSize: 15, color: colors.inkCoolSoft, textAlign: 'center' },
  intentRow: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  intentTag: {
    fontFamily: font.bold, fontSize: 12, color: colors.purple, backgroundColor: colors.purpleSoft,
    borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10,
  },
  dogRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.lineCool, alignSelf: 'stretch',
  },
  dogText: { alignItems: 'flex-end', gap: 2 },
  dogLabel: { fontFamily: font.medium, fontSize: 12, color: colors.inkCoolSoft, textAlign: 'right' },
  dogName: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: 16, justifyContent: 'center' },
  actionBtn: {
    flex: 1, borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center', gap: 4, ...shadow.soft,
  },
  skipBtn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineCool },
  likeBtn: { backgroundColor: colors.rose },
  skipEmoji: { fontSize: 30 },
  likeEmoji: { fontSize: 30 },
  skipLabel: { fontFamily: font.bold, fontSize: 14, color: colors.inkCool },
  likeLabel: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: font.black, fontSize: 18, color: colors.brandDark, textAlign: 'center' },
  emptyText: { fontFamily: font.regular, fontSize: 14, color: colors.inkCoolSoft, textAlign: 'center' },
});
