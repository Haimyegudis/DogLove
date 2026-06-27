import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import MapWebView from '../../../src/components/MapWebView';
import { colors, font, shadow } from '../../../src/theme';
import { requestLocationPermission, getCurrentCoords, getLastKnownCoords, watchCoords } from '../../../src/services/location';
import { geocodeCity } from '../../../src/services/geocode';
import { startWalk, endWalk, updateWalkLocation, nearbyDogs } from '../../../src/services/walk';
import { subscribeActiveWalks } from '../../../src/services/walkRealtime';
import { listMyDogs } from '../../../src/services/dogs';
import { useAuth } from '../../../src/state/AuthContext';
import WalkControls from '../../../src/components/WalkControls';
import type { Coords, NearbyDog } from '../../../src/types/walk';

export default function MapScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [coords, setCoords] = useState<Coords | null>(null);
  const [radiusM, setRadiusM] = useState(3000);
  const [dogs, setDogs] = useState<NearbyDog[]>([]);
  const [walking, setWalking] = useState(false);
  const walkDogId = useRef<string | null>(null);
  const watcher = useRef<{ remove: () => void } | null>(null);
  const toggling = useRef(false);
  const [focusNonce, setFocusNonce] = useState(0);
  const [searchCenter, setSearchCenter] = useState<Coords | null>(null);
  const [cityQ, setCityQ] = useState('');

  // The map view + nearby query center on the searched city if set, else GPS.
  const viewCenter = searchCenter ?? coords;

  async function onFocusMe() {
    // Clear any city search, recenter on me immediately, then refine GPS.
    setSearchCenter(null);
    setFocusNonce((n) => n + 1);
    const c = await getCurrentCoords();
    if (c) { setCoords(c); setFocusNonce((n) => n + 1); }
  }

  async function onSearchCity() {
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
      if (c) setCoords(c);
    })();
    return () => {
      watcher.current?.remove();
      if (walkDogId.current) endWalk(walkDogId.current);
    };
  }, []);

  const refreshNearby = useCallback(async (c: Coords, rM: number) => {
    const { data } = await nearbyDogs(c, rM);
    setDogs(data);
  }, []);

  useEffect(() => { if (viewCenter) refreshNearby(viewCenter, radiusM); }, [viewCenter, radiusM, refreshNearby]);

  // Refresh nearby dogs whenever the Map tab regains focus.
  useFocusEffect(useCallback(() => { if (viewCenter) refreshNearby(viewCenter, radiusM); }, [viewCenter, radiusM, refreshNearby]));

  useEffect(() => {
    const sub = subscribeActiveWalks(() => { if (viewCenter) refreshNearby(viewCenter, radiusM); });
    return () => { sub.unsubscribe(); };
  }, [viewCenter, radiusM, refreshNearby]);

  async function onToggleWalk() {
    if (toggling.current) return;
    toggling.current = true;
    try {
      if (walking) {
        watcher.current?.remove();
        watcher.current = null;
        if (walkDogId.current) await endWalk(walkDogId.current);
        walkDogId.current = null;
        setWalking(false);
        if (coords) refreshNearby(coords, radiusM);
        return;
      }
      const { data: myDogs } = await listMyDogs(userId);
      if (myDogs.length === 0) { Alert.alert('אין כלב', 'הוסף קודם פרופיל כלב כדי לצאת לטיול.'); return; }
      const c = coords ?? (await getCurrentCoords());
      if (!c) { Alert.alert('אין מיקום', 'לא הצלחנו לקבל מיקום.'); return; }
      const dogId = myDogs[0].id;
      const { error } = await startWalk(dogId, c);
      if (error) { Alert.alert('שגיאה', error); return; }
      walkDogId.current = dogId;
      setWalking(true);
      refreshNearby(c, radiusM); // show my dog on the map immediately, don't wait for realtime
      watcher.current = await watchCoords(async (nc) => {
        setCoords(nc);
        if (walkDogId.current) await updateWalkLocation(walkDogId.current, nc);
      });
    } finally {
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
