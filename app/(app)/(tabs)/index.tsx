import { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapWebView from '../../../src/components/MapWebView';
import { requestLocationPermission, getCurrentCoords, watchCoords } from '../../../src/services/location';
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

  useEffect(() => { if (coords) refreshNearby(coords, radiusM); }, [coords, radiusM, refreshNearby]);

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
      <MapWebView center={coords} dogs={dogs} />
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

const styles = StyleSheet.create({ fill: { flex: 1 } });
