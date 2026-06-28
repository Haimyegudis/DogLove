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
    // Vets are tagged a few different ways and are sparse outside big cities.
    elements = `
  node["amenity"="veterinary"](around:${radiusM},${lat},${lng});
  way["amenity"="veterinary"](around:${radiusM},${lat},${lng});
  node["healthcare"="veterinary"](around:${radiusM},${lat},${lng});
  way["healthcare"="veterinary"](around:${radiusM},${lat},${lng});
  node["shop"="veterinary"](around:${radiusM},${lat},${lng});`;
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
// Public Overpass mirrors, tried in order until one returns DATA. The main
// overpass-api.de host works from normal mobile/residential networks; the
// others are fallbacks for when it is busy.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

async function fetchOverpass(oql: string): Promise<any[]> {
  const body = 'data=' + encodeURIComponent(oql);
  let lastErr = '';
  let sawEmpty = false;
  for (const url of OVERPASS_MIRRORS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) { lastErr = `שגיאת שרת: ${res.status}`; continue; }
      const json = await res.json();
      const els: any[] = json?.elements ?? [];
      // A mirror can answer 200 with an empty list while another mirror has
      // the data — don't let an empty answer mask the others.
      if (els.length > 0) return els;
      sawEmpty = true;
    } catch (err: unknown) {
      clearTimeout(timer);
      lastErr = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    }
  }
  if (sawEmpty) return []; // every reachable mirror genuinely had nothing
  throw new Error(lastErr || 'כל השרתים לא זמינים כרגע');
}

// A useful Hebrew label when OSM has no name tag, based on what the place is.
function fallbackName(kind: PlaceKind, tags: any): string {
  if (kind === 'vet') return 'מרפאה וטרינרית';
  if (kind === 'petshop') return 'חנות לחיות מחמד';
  return tags?.leisure === 'dog_park' ? 'גינת כלבים' : 'פארק';
}

export async function nearbyPlaces(
  lat: number,
  lng: number,
  kind: PlaceKind,
  radiusM = 5000,
): Promise<PlacesResult> {
  // Vets are sparse — search a wider ring so towns/suburbs find some.
  const effectiveRadius = kind === 'vet' ? Math.max(radiusM, 15000) : radiusM;
  const oql = buildOQL(kind, effectiveRadius, lat, lng);
  try {
    const elements = await fetchOverpass(oql);

    const places: Place[] = elements
      .map((el) => {
        const elLat: number | undefined = el.lat ?? el.center?.lat;
        const elLng: number | undefined = el.lon ?? el.center?.lon;
        if (elLat === undefined || elLng === undefined) return null;

        return {
          id: el.id as number,
          name: (el.tags?.name as string) || fallbackName(kind, el.tags),
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
