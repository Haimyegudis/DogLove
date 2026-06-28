import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
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

// ── Place card ─────────────────────────────────────────────────────────────
interface PlaceCardProps {
  place: Place;
  userLat: number;
  userLng: number;
  kindConfig: KindConfig;
}

function PlaceCard({ place, userLat, userLng, kindConfig }: PlaceCardProps) {
  const distKm = haversineKm(userLat, userLng, place.lat, place.lng);

  const handlePress = () => {
    const url = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`;
    Linking.openURL(url);
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
        </Text>
      </View>
      <Text style={styles.cardArrow}>‹</Text>
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function PlacesScreen() {
  const [activeKind, setActiveKind] = useState<PlaceKind>('vet');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const kindConfig = KINDS.find((k) => k.kind === activeKind) ?? KINDS[0];

  const load = useCallback(
    async (kind: PlaceKind) => {
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

        const { data, error: fetchErr } = await nearbyPlaces(coords.lat, coords.lng, kind);
        if (fetchErr) {
          setError(fetchErr);
        } else {
          setPlaces(data);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      load(activeKind);
    }, [load, activeKind]),
  );

  const handleKindChange = (kind: PlaceKind) => {
    setActiveKind(kind);
    load(kind);
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

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={kindConfig.color} size="large" />
          <Text style={styles.loadingText}>מחפש בקרבתך…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: kindConfig.color }]} onPress={() => load(activeKind)}>
            <Text style={styles.retryBtnText}>נסה שוב</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={places}
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
              {`לא נמצאו ${kindConfig.label} בקרבתך 🐾`}
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
