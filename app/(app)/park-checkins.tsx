import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DogParkBackground from '../../src/components/DogParkBackground';
import { checkInPark, checkOutPark, nearbyCheckins, type ParkCheckin } from '../../src/services/checkins';
import { getCurrentCoords, requestLocationPermission } from '../../src/services/location';
import { startConversation } from '../../src/services/walkers';
import { colors, font, radius, shadow } from '../../src/theme';
import type { Coords } from '../../src/types/walk';

// ─── helpers ────────────────────────────────────────────────────────────────

function minutesAgoLabel(createdAt: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דק׳`;
  return `לפני ${Math.floor(mins / 60)} ש׳`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} מ׳`;
  return `${(m / 1000).toFixed(1)} ק"מ`;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ParkCheckins() {
  const router = useRouter();

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [nearby, setNearby] = useState<ParkCheckin[]>([]);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // ── fetch list ─────────────────────────────────────────────────────────────
  const refreshList = useCallback(async (center: Coords) => {
    setLoadingList(true);
    const { data, error } = await nearbyCheckins(center);
    if (!mountedRef.current) return;
    setLoadingList(false);
    if (error) { Alert.alert('שגיאה', error); return; }
    setNearby(data);
  }, []);

  // ── initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingLocation(true);
      const granted = await requestLocationPermission();
      if (!granted) {
        setLoadingLocation(false);
        Alert.alert('הרשאת מיקום', 'נדרשת הרשאת מיקום כדי לראות בדקים בקרבתך.');
        return;
      }
      const c = await getCurrentCoords();
      if (!mountedRef.current) return;
      setLoadingLocation(false);
      if (!c) { Alert.alert('מיקום', 'לא הצלחנו לקבל את מיקומך. נסה שוב.'); return; }
      setCoords(c);
      refreshList(c);
    })();
  }, [refreshList]);

  // ── check-in / check-out toggle ────────────────────────────────────────────
  const handleToggle = async () => {
    setToggling(true);
    try {
      if (checkedIn) {
        const { error } = await checkOutPark();
        if (error) { Alert.alert('שגיאה', error); return; }
        setCheckedIn(false);
      } else {
        const granted = await requestLocationPermission();
        if (!granted) { Alert.alert('הרשאת מיקום', 'נדרשת הרשאת מיקום לצ׳ק-אין.'); return; }
        const c = await getCurrentCoords();
        if (!c) { Alert.alert('מיקום', 'לא הצלחנו לאתר אותך. נסה שוב.'); return; }
        const { error } = await checkInPark(c);
        if (error) { Alert.alert('שגיאה', error); return; }
        setCoords(c);
        setCheckedIn(true);
        // Refresh list from the new location.
        refreshList(c);
      }
    } finally {
      if (mountedRef.current) setToggling(false);
    }
  };

  // ── send message ───────────────────────────────────────────────────────────
  const handleMessage = async (item: ParkCheckin) => {
    setMessagingId(item.user_id);
    try {
      const { data: convId, error } = await startConversation(item.user_id);
      if (error || !convId) { Alert.alert('שגיאה', error ?? 'לא ניתן לפתוח שיחה.'); return; }
      router.push(`/(app)/chat/${convId}`);
    } finally {
      if (mountedRef.current) setMessagingId(null);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── title ── */}
          <Text style={styles.title}>מי בפארק עכשיו? 🌳</Text>

          {/* ── check-in toggle ── */}
          <Pressable
            style={[styles.toggleBtn, checkedIn && styles.toggleBtnActive, toggling && styles.toggleBtnDisabled]}
            onPress={handleToggle}
            disabled={toggling || loadingLocation}
          >
            {toggling ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.toggleBtnText}>
                {checkedIn ? 'אני כאן ✓  (צ׳ק-אאוט)' : 'אני בפארק עכשיו 📍'}
              </Text>
            )}
          </Pressable>

          {/* ── status sub-label ── */}
          {checkedIn && (
            <Text style={styles.checkedInNote}>
              הצ׳ק-אין שלך פעיל למשך שעתיים 🐾
            </Text>
          )}

          {/* ── list header ── */}
          <Text style={styles.sectionTitle}>
            {loadingList ? 'טוען...' : `${nearby.length} בקרבתך`}
          </Text>

          {/* ── loading / empty ── */}
          {loadingLocation && (
            <ActivityIndicator color={colors.purple} style={styles.spinner} />
          )}

          {!loadingLocation && !loadingList && nearby.length === 0 && (
            <Text style={styles.empty}>
              אין כרגע בדקים בפארקים קרובים. תהיה הראשון! 🦮
            </Text>
          )}

          {/* ── check-in cards ── */}
          {nearby.map((item) => (
            <View key={item.id} style={styles.card}>
              {/* avatar */}
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarEmoji}>🐶</Text>
                </View>
              )}

              {/* info */}
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.display_name}</Text>
                {!!item.note && <Text style={styles.cardNote}>{item.note}</Text>}
                <Text style={styles.cardMeta}>
                  {formatDistance(item.distance_m)} · {minutesAgoLabel(item.created_at)}
                </Text>
              </View>

              {/* message button */}
              <Pressable
                style={[styles.msgBtn, messagingId === item.user_id && styles.msgBtnDisabled]}
                onPress={() => handleMessage(item)}
                disabled={messagingId === item.user_id}
              >
                {messagingId === item.user_id ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.msgBtnText}>שלח הודעה 💬</Text>
                )}
              </Pressable>
            </View>
          ))}

          {/* ── manual refresh ── */}
          {coords && !loadingList && (
            <Pressable style={styles.refreshBtn} onPress={() => refreshList(coords)}>
              <Text style={styles.refreshBtnText}>רענן רשימה 🔄</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },

  title: {
    fontFamily: font.black,
    fontSize: 26,
    color: colors.bark,
    textAlign: 'center',
    marginBottom: 4,
    writingDirection: 'rtl',
  },

  // ── toggle button ────────────────────────────────────────────────────────
  toggleBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    ...shadow.soft,
  },
  toggleBtnActive: {
    backgroundColor: colors.caramel,
  },
  toggleBtnDisabled: {
    opacity: 0.6,
  },
  toggleBtnText: {
    fontFamily: font.bold,
    fontSize: 17,
    color: colors.white,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  checkedInNote: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.green,
    textAlign: 'center',
    marginTop: -6,
  },

  // ── section heading ───────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.caramel,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 4,
  },

  spinner: { marginTop: 20 },

  empty: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 16,
    writingDirection: 'rtl',
  },

  // ── checkin card ──────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row-reverse',   // RTL: avatar on the right
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
    ...shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purpleSoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 26 },

  cardBody: {
    flex: 1,
    gap: 2,
    alignItems: 'flex-end',         // RTL text alignment
  },
  cardName: {
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.bark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardNote: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardMeta: {
    fontFamily: font.regular,
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: 'right',
  },

  // ── message button ────────────────────────────────────────────────────────
  msgBtn: {
    backgroundColor: colors.purple,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 90,
    alignItems: 'center',
    ...shadow.soft,
  },
  msgBtnDisabled: {
    opacity: 0.6,
  },
  msgBtnText: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.white,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  // ── refresh ───────────────────────────────────────────────────────────────
  refreshBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.lineCool,
    marginTop: 4,
  },
  refreshBtnText: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.caramel,
    writingDirection: 'rtl',
  },
});
