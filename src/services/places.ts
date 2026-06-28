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

export async function nearbyPlaces(
  lat: number,
  lng: number,
  kind: PlaceKind,
  radiusM = 5000,
): Promise<PlacesResult> {
  const oql = buildOQL(kind, radiusM, lat, lng);
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'DogLove/1.0 (dog social app)',
      },
      body: oql,
    });

    if (!res.ok) {
      return { data: [], error: `שגיאת שרת: ${res.status}` };
    }

    const json = await res.json();
    const elements: any[] = json?.elements ?? [];

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
