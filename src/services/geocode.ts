import type { Coords } from '../types/walk';

// Free geocoding via OpenStreetMap Nominatim (no key). City/place name → coords.
export async function geocodeCity(query: string): Promise<Coords | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        // Nominatim's usage policy requires an identifying User-Agent;
        // requests without one are rejected.
        'User-Agent': 'DogLove/1.0 (kelev-love app)',
        'Accept-Language': 'he,en',
      },
    });
    const arr = await res.json();
    if (Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
      return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}
