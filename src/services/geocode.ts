import type { Coords } from '../types/walk';

// Free geocoding via OpenStreetMap Nominatim (no key). City/place name → coords.
export async function geocodeCity(query: string): Promise<Coords | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const arr = await res.json();
    if (Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
      return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}
