// Nearby vets / dog-parks / pet-shops. The Overpass (OpenStreetMap) lookup runs
// SERVER-SIDE via the Supabase `nearby_places` RPC, so it works regardless of
// the phone's network and isn't blocked by flaky public Overpass mirrors.
import { supabase } from '../lib/supabase';

export type PlaceKind = 'vet' | 'park' | 'petshop';

export interface Place {
  id: number;
  name: string;
  lat: number;
  lng: number;
  kind: PlaceKind;
}

type PlacesResult = { data: Place[]; error: string | null };

type RpcRow = { id: number; name: string | null; lat: number; lng: number; kind: string };

// A useful Hebrew label when OSM has no name tag.
function fallbackName(kind: PlaceKind): string {
  if (kind === 'vet') return 'מרפאה וטרינרית';
  if (kind === 'petshop') return 'חנות לחיות מחמד';
  return 'גינת כלבים';
}

export async function nearbyPlaces(
  lat: number,
  lng: number,
  kind: PlaceKind,
  radiusM = 5000,
): Promise<PlacesResult> {
  const { data, error } = await supabase.rpc('nearby_places', {
    p_lat: lat,
    p_lng: lng,
    p_kind: kind,
    p_radius_m: radiusM,
  });
  if (error) return { data: [], error: error.message };

  const places: Place[] = (data as RpcRow[] ?? [])
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      name: r.name || fallbackName(kind),
      lat: r.lat,
      lng: r.lng,
      kind,
    }));

  return { data: places, error: null };
}
