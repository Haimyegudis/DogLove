import { supabase } from '../lib/supabase';
import type { Coords } from '../types/walk';

export interface ParkCheckin {
  id: string;
  user_id: string;
  display_name: string;
  photo_url: string | null;
  note: string | null;
  lat: number;
  lng: number;
  distance_m: number;
  created_at: string;
}

/** Check the current user in at their current location for 2 hours. */
export async function checkInPark(coords: Coords, note?: string | null) {
  const { data, error } = await supabase.rpc('check_in_park', {
    p_lat: coords.lat,
    p_lng: coords.lng,
    p_note: note ?? null,
  });
  return { data: (data as string | null), error: error?.message ?? null };
}

/** Remove the current user's active park check-in immediately. */
export async function checkOutPark() {
  const { error } = await supabase.rpc('check_out_park');
  return { error: error?.message ?? null };
}

/** Fetch active check-ins within `radiusM` metres of `coords`. */
export async function nearbyCheckins(coords: Coords, radiusM = 5000) {
  const { data, error } = await supabase.rpc('nearby_checkins', {
    p_lat: coords.lat,
    p_lng: coords.lng,
    p_radius_m: radiusM,
  });
  return { data: (data as ParkCheckin[]) ?? [], error: error?.message ?? null };
}
