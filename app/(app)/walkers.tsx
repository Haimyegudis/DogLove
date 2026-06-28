import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/state/AuthContext';
import { colors, font, radius } from '../../src/theme';
import { availableWalkers, startConversation } from '../../src/services/walkers';
import Avatar from '../../src/components/Avatar';
import type { Walker } from '../../src/types/walker';

export default function Walkers() {
  const router = useRouter();
  const { session } = useAuth();
  const [city, setCity] = useState('');
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (filterCity = city) => {
    setLoading(true);
    try {
      const { data, error } = await availableWalkers(filterCity);
      if (error) { Alert.alert('שגיאה', error); return; }
      setWalkers(data);
    } finally {
      setLoading(false);
    }
  }, [city]);

  useFocusEffect(
    useCallback(() => {
      load(city);
    }, []),
  );

  async function handleMessage(walker: Walker) {
    const { data, error } = await startConversation(walker.user_id);
    if (error || !data) { Alert.alert('שגיאה', error ?? 'שגיאה לא ידועה'); return; }
    router.push(`/(app)/chat/${data}?name=${encodeURIComponent(walker.display_name ?? 'מטייל')}`);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'מטיילי כלבים 🦮' }} />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="סנן לפי עיר…"
          placeholderTextColor={colors.inkCoolSoft}
          value={city}
          onChangeText={setCity}
          textAlign="right"
        />
        <Pressable style={styles.searchBtn} onPress={() => load(city)}>
          <Text style={styles.searchBtnText}>חפש</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.rose} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {walkers.length === 0 ? (
            <Text style={styles.empty}>אין מטיילים זמינים כרגע</Text>
          ) : (
            walkers.map((walker) => (
              <View key={walker.user_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Avatar uri={walker.photo_url} fallback="🦮" size={56} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{walker.display_name}</Text>
                    {walker.city ? <Text style={styles.cityText}>📍 {walker.city}</Text> : null}
                    <Text style={styles.rating}>
                      {walker.rating_count > 0
                        ? `⭐ ${walker.avg_stars} (${walker.rating_count})`
                        : 'חדש'}
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.msgBtn} onPress={() => handleMessage(walker)}>
                  <Text style={styles.msgBtnText}>שלח הודעה 💬</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row-reverse', padding: 14, gap: 10 },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineCool,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.brandDark,
  },
  searchBtn: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: {
    fontFamily: font.regular,
    color: colors.inkCoolSoft,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineCool,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center' },
  cardInfo: { flex: 1, gap: 4 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  cityText: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft, textAlign: 'right' },
  rating: { fontFamily: font.medium, fontSize: 13, color: colors.rose, textAlign: 'right' },
  msgBtn: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  msgBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.white },
});
