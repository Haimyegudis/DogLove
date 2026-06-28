import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import MapWebView from '../../../src/components/MapWebView';
import { colors, font, shadow } from '../../../src/theme';
import { requestLocationPermission, getCurrentCoords, getLastKnownCoords, watchCoords } from '../../../src/services/location';
import { geocodeCity } from '../../../src/services/geocode';
import { startWalk, endWalk, updateWalkLocation, nearbyDogs } from '../../../src/services/walk';
import { subscribeActiveWalks } from '../../../src/services/walkRealtime';
import { amIPremium } from '../../../src/services/premium';
import { setHomeLocation } from '../../../src/services/feed';
import { listMyDogs } from '../../../src/services/dogs';
import { useAuth } from '../../../src/state/AuthContext';
import WalkControls from '../../../src/components/WalkControls';
import type { Coords, NearbyDog } from '../../../src/types/walk';

function haversine(a: Coords, b: Coords): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function MapScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const [premium, setPremium] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [radiusM, setRadiusM] = useState(3000);
  const [dogs, setDogs] = useState<NearbyDog[]>([]);
  const [walking, setWalking] = useState(false);
  const walkDogId = useRef<string | null>(null);
  const watcher = useRef<{ remove: () => void } | null>(null);
  const toggling = useRef(false);
  const distanceRef = useRef(0);
  const lastWalkCoordRef = useRef<Coords | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [searchCenter, setSearchCenter] = useState<Coords | null>(null);
  const [cityQ, setCityQ] = useState('');

  // The map view + nearby query center on the searched city if set, else GPS.
  const viewCenter = searchCenter ?? coords;

  // Refs so realtime callback always reads fresh values without re-subscribing.
  const viewCenterRef = useRef(viewCenter);
  const radiusRef = useRef(radiusM);
  viewCenterRef.current = viewCenter;
  radiusRef.current = radiusM;

  async function onFocusMe() {
    // Clear any city search, recenter on me immediately, then refine GPS.
    setSearchCenter(null);
    setFocusNonce((n) => n + 1);
    const c = await getCurrentCoords();
    if (c) { setCoords(c); setFocusNonce((n) => n + 1); }
  }

  async function onSearchCity() {
    // Browsing other areas/cities is a Premium perk; free users stay local.
    if (!premium) {
      Alert.alert(
        'תכונת Premium ⭐',
        'חיפוש כלבים בערים ואזורים אחרים זמין למשתמשי Premium. לשדרג?',
        [
          { text: 'לא עכשיו', style: 'cancel' },
          { text: 'שדרג', onPress: () => router.push('/(app)/premium') },
        ],
      );
      return;
    }
    const c = await geocodeCity(cityQ);
    if (!c) { Alert.alert('לא נמצא', 'לא מצאנו את המקום הזה.'); return; }
    setSearchCenter(c);
    setFocusNonce((n) => n + 1);
    refreshNearby(c, radiusM);
  }

  useEffect(() => {
    (async () => {
      const ok = await requestLocationPermission();
      if (!ok) { Alert.alert('צריך הרשאת מיקום', 'כדי להראות כלבים קרובים, אפשר גישה למיקום.'); return; }
      const last = await getLastKnownCoords();  // instant first center
      if (last) setCoords(last);
      const c = await getCurrentCoords();        // precise fix
      if (c) { setCoords(c); setHomeLocation(c.lat, c.lng); } // stamp home for distance-based feed
    })();
    return () => {
      watcher.current?.remove();
      if (walkDogId.current) endWalk(walkDogId.current, distanceRef.current);
    };
  }, []);

  const refreshNearby = useCallback(async (c: Coords, rM: number) => {
    const { data } = await nearbyDogs(c, rM);
    setDogs(data);
  }, []);

  useEffect(() => { if (viewCenter) refreshNearby(viewCenter, radiusM); }, [viewCenter, radiusM, refreshNearby]);

  // Refresh nearby dogs whenever the Map tab regains focus.
  useFocusEffect(useCallback(() => { if (viewCenter) refreshNearby(viewCenter, radiusM); }, [viewCenter, radiusM, refreshNearby]));

  // Keep premium status fresh so the city-search gate reflects upgrades.
  useFocusEffect(useCallback(() => {
    let active = true;
    amIPremium().then(({ data }) => { if (active) setPremium(!!data); });
    return () => { active = false; };
  }, []));

  // Subscribe ONCE on mount; refs supply fresh center/radius each callback.
  useEffect(() => {
    const sub = subscribeActiveWalks(() => {
      const c = viewCenterRef.current;
      if (c) refreshNearby(c, radiusRef.current);
    });
    return () => { sub.unsubscribe(); };
  }, [refreshNearby]);

  async function actuallyStartWalk() {
    try {
      const { data: myDogs } = await listMyDogs(userId);
      if (myDogs.length === 0) { Alert.alert('אין כלב', 'הוסף קודם פרופיל כלב כדי לצאת לטיול.'); return; }
      const c = coords ?? (await getCurrentCoords());
      if (!c) { Alert.alert('אין מיקום', 'לא הצלחנו לקבל מיקום.'); return; }
      const dogId = myDogs[0].id;
      distanceRef.current = 0;
      lastWalkCoordRef.current = c;
      const { error } = await startWalk(dogId, c);
      if (error) { Alert.alert('שגיאה', error); return; }
      walkDogId.current = dogId;
      setWalking(true);
      refreshNearby(c, radiusM); // show my dog on the map immediately, don't wait for realtime
      watcher.current = await watchCoords(async (nc) => {
        if (lastWalkCoordRef.current) distanceRef.current += haversine(lastWalkCoordRef.current, nc);
        lastWalkCoordRef.current = nc;
        setCoords(nc);
        if (walkDogId.current) await updateWalkLocation(walkDogId.current, nc);
      });
    } finally {
      toggling.current = false;
    }
  }

  async function onToggleWalk() {
    if (toggling.current) return;
    toggling.current = true;
    try {
      if (walking) {
        watcher.current?.remove();
        watcher.current = null;
        if (walkDogId.current) await endWalk(walkDogId.current, distanceRef.current);
        walkDogId.current = null;
        setWalking(false);
        if (coords) refreshNearby(coords, radiusM);
        return;
      }
      // FR-6.2: one-time consent gate before first walk.
      const consentGiven = await AsyncStorage.getItem('doglove.walkConsent.v1');
      if (!consentGiven) {
        toggling.current = false; // don't leave toggling stuck while alert is shown
        Alert.alert(
          'שיתוף מיקום',
          'בזמן הליכה, משתמשים קרובים יראו את מיקום הכלב שלך. ברגע שתסיים — זה נפסק.',
          [
            { text: 'ביטול', style: 'cancel' },
            {
              text: 'הבנתי, התחל',
              onPress: async () => {
                await AsyncStorage.setItem('doglove.walkConsent.v1', 'true');
                toggling.current = true;
                await actuallyStartWalk();
              },
            },
          ],
        );
        return;
      }
      await actuallyStartWalk();
    } finally {
      // actuallyStartWalk resets toggling.current itself; only reset here for
      // the early-return paths above (stop-walk branch and consent gate return).
      toggling.current = false;
    }
  }

  return (
    <View style={styles.fill}>
      <MapWebView center={viewCenter} me={coords} dogs={dogs} radiusM={radiusM} focusNonce={focusNonce} />
      <SafeAreaView style={styles.topWrap} pointerEvents="box-none">
        <View style={[styles.searchBar, shadow.soft]}>
          <TextInput
            style={styles.searchInput}
            placeholder="חפש עיר או מקום…"
            placeholderTextColor={colors.inkCoolSoft}
            value={cityQ}
            onChangeText={setCityQ}
            onSubmitEditing={onSearchCity}
            returnKeyType="search"
          />
          <Pressable onPress={onSearchCity} style={styles.searchGo}><Text style={styles.searchGoText}>🔎</Text></Pressable>
        </View>
        <View style={styles.topActions} pointerEvents="box-none">
          {searchCenter ? (
            <Pressable onPress={onFocusMe} style={[styles.pill, shadow.soft]}>
              <Text style={styles.pillText}>↩︎ חזרה אליי</Text>
            </Pressable>
          ) : <View />}
          <Pressable testID="focus-me" onPress={onFocusMe} style={[styles.focusBtn, shadow.soft]}>
            <Text style={styles.focusIcon}>📍</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <WalkControls
        walking={walking}
        radiusM={radiusM}
        nearbyCount={dogs.length}
        onToggleWalk={onToggleWalk}
        onSelectRadius={setRadiusM}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topWrap: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, gap: 10 },
  searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.lineCool },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, fontFamily: font.regular, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  searchGo: { paddingHorizontal: 4 },
  searchGoText: { fontSize: 18 },
  topActions: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  pill: { backgroundColor: colors.white, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.lineCool },
  pillText: { fontFamily: font.bold, fontSize: 13, color: colors.coralDeep },
  focusBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineCool },
  focusIcon: { fontSize: 22 },
});
