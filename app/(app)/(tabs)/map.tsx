import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import MapWebView from '../../../src/components/MapWebView';
import { colors, shadow } from '../../../src/theme';
import { requestLocationPermission, getCurrentCoords, getLastKnownCoords, watchCoords } from '../../../src/services/location';
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

  async function onFocusMe() {
    // Recenter immediately on whatever we already have, then refine.
    setFocusNonce((n) => n + 1);
    const c = await getCurrentCoords();
    if (c) { setCoords(c); setFocusNonce((n) => n + 1); }
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

  useEffect(() => { if (coords) refreshNearby(coords, radiusM); }, [coords, radiusM, refreshNearby]);

  // Refresh nearby dogs whenever the Map tab regains focus.
  useFocusEffect(useCallback(() => { if (coords) refreshNearby(coords, radiusM); }, [coords, radiusM, refreshNearby]));

  useEffect(() => {
    const sub = subscribeActiveWalks(() => { if (coords) refreshNearby(coords, radiusM); });
    return () => { sub.unsubscribe(); };
  }, [coords, radiusM, refreshNearby]);

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
      <MapWebView center={coords} dogs={dogs} radiusM={radiusM} focusNonce={focusNonce} />
      <SafeAreaView style={styles.focusWrap} pointerEvents="box-none">
        <Pressable testID="focus-me" onPress={onFocusMe} style={[styles.focusBtn, shadow.soft]}>
          <Text style={styles.focusIcon}>📍</Text>
        </Pressable>
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
  focusWrap: { position: 'absolute', top: 0, left: 0, padding: 14 },
  focusBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineCool },
  focusIcon: { fontSize: 22 },
});
