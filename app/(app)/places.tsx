import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { colors, font, radius, shadow } from '../../src/theme';
import { getCurrentCoords } from '../../src/services/location';
import { nearbyPlaces, type Place, type PlaceKind } from '../../src/services/places';

// ── Haversine distance helper ──────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} מ'`;
  return `${km.toFixed(1)} ק"מ`;
}

// ── Kind chip config ───────────────────────────────────────────────────────
interface KindConfig {
  kind: PlaceKind;
  label: string;
  emoji: string;
  color: string;
  softColor: string;
}

const KINDS: KindConfig[] = [
  { kind: 'vet', label: 'וטרינרים', emoji: '🏥', color: colors.rose, softColor: colors.roseSoft },
  { kind: 'park', label: 'גינות כלבים', emoji: '🌳', color: colors.green, softColor: colors.greenSoft },
  { kind: 'petshop', label: 'חנויות', emoji: '🛒', color: colors.purple, softColor: colors.purpleSoft },
];

const RADII_KM = [5, 10, 25, 50];

// ── Place card ─────────────────────────────────────────────────────────────
interface PlaceCardProps {
  place: Place;
  userLat: number;
  userLng: number;
  kindConfig: KindConfig;
}

function PlaceCard({ place, userLat, userLng, kindConfig }: PlaceCardProps) {
  const router = useRouter();
  const distKm = haversineKm(userLat, userLng, place.lat, place.lng);

  const handlePress = () => {
    router.push({
      pathname: '/(app)/place/[id]',
      params: { id: String(place.id), kind: place.kind, name: place.name, lat: String(place.lat), lng: String(place.lng) },
    });
  };

  return (
    <Pressable style={styles.card} onPress={handlePress} accessibilityRole="button">
      <View style={[styles.kindBadge, { backgroundColor: kindConfig.softColor }]}>
        <Text style={styles.kindEmoji}>{kindConfig.emoji}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={[styles.placeDistance, { color: kindConfig.color }]}>
          {formatDistance(distKm)} ממך
          {place.ratingCount ? `  ·  ⭐ ${place.avgStars} (${place.ratingCount})` : '  ·  אין דירוג'}
        </Text>
      </View>
      <Text style={styles.cardArrow}>‹</Text>
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function PlacesScreen() {
  const [activeKind, setActiveKind] = useState<PlaceKind>('vet');
  const [radiusKm, setRadiusKm] = useState(10);
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const kindConfig = KINDS.find((k) => k.kind === activeKind) ?? KINDS[0];

  const sortedPlaces = useMemo(() => {
    if (userLat == null || userLng == null) return places;
    const arr = [...places];
    if (sortBy === 'rating') {
      arr.sort((a, b) => (b.avgStars ?? 0) - (a.avgStars ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    } else {
      arr.sort((a, b) =>
        haversineKm(userLat, userLng, a.lat, a.lng) - haversineKm(userLat, userLng, b.lat, b.lng));
    }
    return arr;
  }, [places, sortBy, userLat, userLng]);

  const load = useCallback(
    async (kind: PlaceKind, km: number) => {
      setLoading(true);
      setError(null);
      setPlaces([]);
      try {
        const coords = await getCurrentCoords();
        if (!coords) {
          setError('לא ניתן לאתר מיקומך. אנא הפעל את שירותי המיקום.');
          return;
        }
        setUserLat(coords.lat);
        setUserLng(coords.lng);

        const { data, error: fetchErr } = await nearbyPlaces(coords.lat, coords.lng, kind, km * 1000);
        if (fetchErr) {
          setError(fetchErr);
        } else {
          // Nearest first.
          const sorted = [...data].sort(
            (a, b) =>
              haversineKm(coords.lat, coords.lng, a.lat, a.lng) -
              haversineKm(coords.lat, coords.lng, b.lat, b.lng),
          );
          setPlaces(sorted);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      load(activeKind, radiusKm);
    }, [load, activeKind, radiusKm]),
  );

  const handleKindChange = (kind: PlaceKind) => {
    setActiveKind(kind);
    load(kind, radiusKm);
  };

  const handleRadiusChange = (km: number) => {
    setRadiusKm(km);
    load(activeKind, km);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'שירותים בקרבת מקום' }} />

      {/* Kind chips */}
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {KINDS.map((k) => {
            const isActive = k.kind === activeKind;
            return (
              <Pressable
                key={k.kind}
                style={[
                  styles.chip,
                  { borderColor: k.color },
                  isActive && { backgroundColor: k.color },
                ]}
                onPress={() => handleKindChange(k.kind)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    { color: isActive ? colors.white : k.color },
                  ]}
                >
                  {k.emoji} {k.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Radius selector */}
      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>טווח:</Text>
        {RADII_KM.map((km) => {
          const on = km === radiusKm;
          return (
            <Pressable key={km} onPress={() => handleRadiusChange(km)} style={[styles.radiusChip, on && { backgroundColor: kindConfig.color, borderColor: kindConfig.color }]}>
              <Text style={[styles.radiusChipText, on && { color: colors.white }]}>{km} ק"מ</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sort toggle */}
      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>מיון:</Text>
        <Pressable onPress={() => setSortBy('distance')} style={[styles.radiusChip, sortBy === 'distance' && { backgroundColor: kindConfig.color, borderColor: kindConfig.color }]}>
          <Text style={[styles.radiusChipText, sortBy === 'distance' && { color: colors.white }]}>מרחק</Text>
        </Pressable>
        <Pressable onPress={() => setSortBy('rating')} style={[styles.radiusChip, sortBy === 'rating' && { backgroundColor: kindConfig.color, borderColor: kindConfig.color }]}>
          <Text style={[styles.radiusChipText, sortBy === 'rating' && { color: colors.white }]}>דירוג ⭐</Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={kindConfig.color} size="large" />
          <Text style={styles.loadingText}>מחפש בקרבתך…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: kindConfig.color }]} onPress={() => load(activeKind, radiusKm)}>
            <Text style={styles.retryBtnText}>נסה שוב</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sortedPlaces}
          keyExtractor={(item) => `${item.id}`}
          renderItem={({ item }) =>
            userLat !== null && userLng !== null ? (
              <PlaceCard
                place={item}
                userLat={userLat}
                userLng={userLng}
                kindConfig={kindConfig}
              />
            ) : null
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {`לא נמצאו ${kindConfig.label} ברדיוס ${radiusKm} ק"מ. נסה טווח גדול יותר 🐾`}
            </Text>
          }
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },

  chipsWrapper: {
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineCool,
    backgroundColor: colors.white,
  },
  chips: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipLabel: {
    fontFamily: font.medium,
    fontSize: 14,
  },

  radiusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lineCool },
  radiusLabel: { fontFamily: font.medium, fontSize: 13, color: colors.inkCoolSoft },
  radiusChip: { borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.lineCool, paddingVertical: 5, paddingHorizontal: 12 },
  radiusChipText: { fontFamily: font.medium, fontSize: 13, color: colors.inkCoolSoft },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontFamily: font.regular, color: colors.inkCoolSoft, fontSize: 15 },
  errorText: {
    fontFamily: font.regular,
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 24,
    ...shadow.soft,
  },
  retryBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.white },

  list: { paddingVertical: 8, paddingBottom: 32 },
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
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    ...shadow.card,
  },
  kindBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindEmoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  placeName: {
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.brandDark,
    textAlign: 'right',
    marginBottom: 2,
  },
  placeDistance: {
    fontFamily: font.regular,
    fontSize: 13,
    textAlign: 'right',
  },
  cardArrow: {
    fontSize: 20,
    color: colors.inkCoolSoft,
    transform: [{ scaleX: -1 }],
  },
});
