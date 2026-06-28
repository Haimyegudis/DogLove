// Client-side Overpass API fetch — no Supabase, no migration needed.

export type PlaceKind = 'vet' | 'park' | 'petshop';

export interface Place {
  id: number;
  name: string;
  lat: number;
  lng: number;
  kind: PlaceKind;
}

type PlacesResult = { data: Place[]; error: string | null };

// Map app kind → one or more OQL filter clauses.
function buildOQL(kind: PlaceKind, radiusM: number, lat: number, lng: number): string {
  let elements: string;

  if (kind === 'vet') {
    elements = `
  node["amenity"="veterinary"](around:${radiusM},${lat},${lng});
  way["amenity"="veterinary"](around:${radiusM},${lat},${lng});`;
  } else if (kind === 'park') {
    // dog_park first, then generic leisure=park as fall-back
    elements = `
  node["leisure"="dog_park"](around:${radiusM},${lat},${lng});
  way["leisure"="dog_park"](around:${radiusM},${lat},${lng});
  node["leisure"="park"](around:${radiusM},${lat},${lng});
  way["leisure"="park"](around:${radiusM},${lat},${lng});`;
  } else {
    // petshop
    elements = `
  node["shop"="pet"](around:${radiusM},${lat},${lng});
  way["shop"="pet"](around:${radiusM},${lat},${lng});`;
  }

  return `[out:json][timeout:25];(${elements}
);out center 50;`;
}

// Public Overpass mirrors, tried in order. The main overpass-api.de host often
// rate-limits or rejects mobile requests (429/406/504), so we fall back across
// several mirrors and use whichever answers first.
const OVERPASS_MIRRORS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

async function fetchOverpass(oql: string): Promise<any[]> {
  const body = 'data=' + encodeURIComponent(oql);
  let lastErr = '';
  for (const url of OVERPASS_MIRRORS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) { lastErr = `שגיאת שרת: ${res.status}`; continue; }
      const json = await res.json();
      return json?.elements ?? [];
    } catch (err: unknown) {
      clearTimeout(timer);
      lastErr = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    }
  }
  throw new Error(lastErr || 'כל השרתים לא זמינים כרגע');
}

export async function nearbyPlaces(
  lat: number,
  lng: number,
  kind: PlaceKind,
  radiusM = 5000,
): Promise<PlacesResult> {
  const oql = buildOQL(kind, radiusM, lat, lng);
  try {
    const elements = await fetchOverpass(oql);

    const places: Place[] = elements
      .map((el) => {
        const elLat: number | undefined = el.lat ?? el.center?.lat;
        const elLng: number | undefined = el.lon ?? el.center?.lon;
        if (elLat === undefined || elLng === undefined) return null;

        return {
          id: el.id as number,
          name: (el.tags?.name as string) || 'ללא שם',
          lat: elLat,
          lng: elLng,
          kind,
        } satisfies Place;
      })
      .filter((p): p is Place => p !== null);

    return { data: places, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    return { data: [], error: message };
  }
}
