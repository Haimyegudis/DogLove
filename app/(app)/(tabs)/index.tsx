import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { initMapbox } from '../../../src/lib/mapbox';
import { requestLocationPermission, getCurrentCoords, watchCoords } from '../../../src/services/location';
import { startWalk, endWalk, updateWalkLocation, nearbyDogs } from '../../../src/services/walk';
import { subscribeActiveWalks } from '../../../src/services/walkRealtime';
import { listMyDogs } from '../../../src/services/dogs';
import { useAuth } from '../../../src/state/AuthContext';
import WalkControls from '../../../src/components/WalkControls';
import type { Coords, NearbyDog } from '../../../src/types/walk';
import { colors } from '../../../src/theme';

initMapbox();

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

  // Initial location + permission
  useEffect(() => {
    (async () => {
      const ok = await requestLocationPermission();
      if (!ok) { Alert.alert('צריך הרשאת מיקום', 'כדי להראות כלבים קרובים, אפשר גישה למיקום.'); return; }
      const c = await getCurrentCoords();
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

  // Re-query when location/radius change
  useEffect(() => { if (coords) refreshNearby(coords, radiusM); }, [coords, radiusM, refreshNearby]);

  // Realtime: any walk change → re-query
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
      // Start: need a dog + a location
      const { data: myDogs } = await listMyDogs(userId);
      if (myDogs.length === 0) { Alert.alert('אין כלב', 'הוסף קודם פרופיל כלב כדי לצאת לטיול.'); return; }
      const c = coords ?? (await getCurrentCoords());
      if (!c) { Alert.alert('אין מיקום', 'לא הצלחנו לקבל מיקום.'); return; }
      const dogId = myDogs[0].id;
      const { error } = await startWalk(dogId, c);
      if (error) { Alert.alert('שגיאה', error); return; }
      walkDogId.current = dogId;
      setWalking(true);
      // push location every ~20s
      watcher.current = await watchCoords(async (nc) => {
        setCoords(nc);
        if (walkDogId.current) await updateWalkLocation(walkDogId.current, nc);
      });
    } finally {
      toggling.current = false;
    }
  }

  const center: [number, number] = coords ? [coords.lng, coords.lat] : [34.78, 32.08]; // fallback: Tel Aviv

  return (
    <View style={styles.fill}>
      <Mapbox.MapView style={styles.fill} styleURL={Mapbox.StyleURL.Street}>
        <Mapbox.Camera zoomLevel={14} centerCoordinate={center} animationDuration={600} />
        {coords && (
          <Mapbox.PointAnnotation id="me" coordinate={[coords.lng, coords.lat]}>
            <View style={styles.me} />
          </Mapbox.PointAnnotation>
        )}
        {dogs.map((d) => (
          <Mapbox.PointAnnotation key={d.dog_id} id={d.dog_id} coordinate={[d.lng, d.lat]}>
            <View style={styles.dogPin}><Text style={styles.dogPinText}>🐕</Text></View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

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
  me: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.sky, borderWidth: 3, borderColor: colors.white },
  dogPin: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  dogPinText: { fontSize: 20 },
});
