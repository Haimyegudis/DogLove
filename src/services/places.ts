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
  avgStars?: number;
  ratingCount?: number;
}

type PlacesResult = { data: Place[]; error: string | null };

export interface PlaceReview {
  stars: number;
  comment: string | null;
  tags: string[] | null;
  reviewer_name: string | null;
  created_at: string;
}

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

  // Merge in user ratings for these places (best-effort; ignore failures).
  if (places.length > 0) {
    const { data: ratings } = await supabase.rpc('place_ratings', {
      p_ids: places.map((p) => p.id),
      p_kind: kind,
    });
    if (ratings) {
      const byId = new Map<number, { avg_stars: number; rating_count: number }>(
        (ratings as { place_id: number; avg_stars: number; rating_count: number }[]).map((r) => [
          r.place_id, { avg_stars: r.avg_stars, rating_count: r.rating_count },
        ]),
      );
      for (const p of places) {
        const r = byId.get(p.id);
        if (r) { p.avgStars = r.avg_stars; p.ratingCount = r.rating_count; }
      }
    }
  }

  return { data: places, error: null };
}

export async function ratePlace(args: {
  placeId: number; kind: PlaceKind; stars: number; comment?: string;
  tags?: string[]; name?: string; lat?: number; lng?: number;
}) {
  const { error } = await supabase.rpc('rate_place', {
    p_place_id: args.placeId, p_kind: args.kind, p_stars: args.stars,
    p_comment: args.comment ?? null, p_tags: args.tags ?? null,
    p_name: args.name ?? null, p_lat: args.lat ?? null, p_lng: args.lng ?? null,
  });
  return { error: error?.message ?? null };
}

export async function listPlaceReviews(placeId: number, kind: PlaceKind) {
  const { data, error } = await supabase.rpc('list_place_reviews', { p_place_id: placeId, p_kind: kind });
  return { data: (data as PlaceReview[]) ?? [], error: error?.message ?? null };
}

export async function myPlaceReview(placeId: number, kind: PlaceKind) {
  const { data, error } = await supabase.rpc('my_place_review', { p_place_id: placeId, p_kind: kind });
  const row = (data as { stars: number; comment: string | null; tags: string[] | null }[])?.[0] ?? null;
  return { data: row, error: error?.message ?? null };
}
