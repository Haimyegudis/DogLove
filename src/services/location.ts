import * as Location from 'expo-location';
import type { Coords } from '../types/walk';

export async function requestLocationPermission(): Promise<boolean> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

export async function getCurrentCoords(): Promise<Coords | null> {
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  if (!pos) return null;
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export async function watchCoords(onCoords: (c: Coords) => void, intervalMs = 20000) {
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: intervalMs, distanceInterval: 10 },
    (pos: any) => onCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
  );
}
