import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { colors, font, radius } from '../../src/theme';
import { nearbyWalkers, startConversation } from '../../src/services/walkers';
import { requestLocationPermission, getCurrentCoords } from '../../src/services/location';
import { geocodeCity } from '../../src/services/geocode';
import Avatar from '../../src/components/Avatar';
import CityPicker from '../../src/components/CityPicker';
import type { Walker } from '../../src/types/walker';
import type { Coords } from '../../src/types/walk';

const RADII = [
  { label: '1 ק״מ', m: 1000 },
  { label: '3 ק״מ', m: 3000 },
  { label: '5 ק״מ', m: 5000 },
  { label: '10 ק״מ', m: 10000 },
];

export default function Walkers() {
  const router = useRouter();
  const [center, setCenter] = useState<Coords | null>(null);
  const [radiusM, setRadiusM] = useState(5000);
  const [cityQ, setCityQ] = useState('');
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (c: Coords, rM: number) => {
    setLoading(true);
    try {
      const { data, error } = await nearbyWalkers(c, rM);
      if (error) { Alert.alert('שגיאה', error); return; }
      setWalkers(data);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const useMyLocation = useCallback(async () => {
    const ok = await requestLocationPermission();
    if (!ok) { Alert.alert('צריך הרשאת מיקום', 'אפשר גישה למיקום כדי למצוא מטיילים קרובים.'); return; }
    const c = await getCurrentCoords();
    if (!c) { Alert.alert('אין מיקום', 'לא הצלחנו לקבל מיקום.'); return; }
    setCenter(c);
    search(c, radiusM);
  }, [radiusM, search]);

  async function onSearchCity() {
    const c = await geocodeCity(cityQ);
    if (!c) { Alert.alert('לא נמצא', 'לא מצאנו את המקום הזה.'); return; }
    setCenter(c);
    search(c, radiusM);
  }

  function onPickRadius(rM: number) {
    setRadiusM(rM);
    if (center) search(center, rM);
  }

  // Try the user's location automatically the first time the screen opens.
  useFocusEffect(
    useCallback(() => {
      if (!center) useMyLocation();
    }, [center, useMyLocation]),
  );

  async function handleMessage(walker: Walker) {
    const { data, error } = await startConversation(walker.user_id);
    if (error || !data) { Alert.alert('שגיאה', error ?? 'שגיאה לא ידועה'); return; }
    router.push(`/(app)/chat/${data}?name=${encodeURIComponent(walker.display_name ?? 'מטייל')}`);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'מטיילי כלבים 🦮' }} />

      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <CityPicker value={cityQ} onChange={setCityQ} placeholder="חפש עיר או כתובת…" onSubmit={onSearchCity} />
          </View>
          <Pressable style={styles.searchBtn} onPress={onSearchCity}>
            <Text style={styles.searchBtnText}>חפש</Text>
          </Pressable>
        </View>

        <Pressable style={styles.locBtn} onPress={useMyLocation}>
          <Text style={styles.locBtnText}>📍 השתמש במיקום שלי</Text>
        </Pressable>

        <View style={styles.radiusRow}>
          {RADII.map((r) => (
            <Pressable key={r.m} onPress={() => onPickRadius(r.m)} style={[styles.chip, radiusM === r.m && styles.chipOn]}>
              <Text style={[styles.chipText, radiusM === r.m && styles.chipTextOn]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.rose} />
        </View>
      ) : (
        <FlatList
          data={walkers}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item: walker }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Avatar uri={walker.photo_url} fallback="🦮" size={56} />
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{walker.display_name}</Text>
                  <Text style={styles.cityText}>
                    📍 {walker.distance_m != null ? `${(walker.distance_m / 1000).toFixed(1)} ק״מ ממך` : (walker.city ?? '')}
                  </Text>
                  <Text style={styles.rating}>
                    {walker.rating_count > 0 ? `⭐ ${walker.avg_stars} (${walker.rating_count})` : 'חדש'}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.msgBtn} onPress={() => handleMessage(walker)}>
                <Text style={styles.msgBtnText}>שלח הודעה 💬</Text>
              </Pressable>
            </View>
          )}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searched ? 'אין מטיילים בטווח שבחרת. נסה מרחק גדול יותר.' : 'בחר מיקום כדי למצוא מטיילים קרובים.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { padding: 14, gap: 10 },
  searchRow: { flexDirection: 'row-reverse', gap: 10 },
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
  searchBtn: { backgroundColor: colors.rose, borderRadius: radius.sm, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  locBtn: { alignSelf: 'flex-end', backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.green },
  locBtnText: { fontFamily: font.bold, fontSize: 13, color: colors.green },
  radiusRow: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.lineCool, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.roseSoft, borderColor: colors.rose },
  chipText: { fontFamily: font.medium, color: colors.inkCoolSoft, fontSize: 13 },
  chipTextOn: { color: colors.rose, fontFamily: font.bold },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { fontFamily: font.regular, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 40, fontSize: 15, paddingHorizontal: 24 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineCool, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center' },
  cardInfo: { flex: 1, gap: 4 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  cityText: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft, textAlign: 'right' },
  rating: { fontFamily: font.medium, fontSize: 13, color: colors.rose, textAlign: 'right' },
  msgBtn: { backgroundColor: colors.rose, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  msgBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.white },
});
