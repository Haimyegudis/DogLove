import { supabase } from '../lib/supabase';
import type { Coords, NearbyDog } from '../types/walk';

export async function startWalk(dogId: string, c: Coords) {
  const { error } = await supabase.rpc('start_walk', { p_dog_id: dogId, p_lat: c.lat, p_lng: c.lng });
  return { error: error?.message ?? null };
}

export async function updateWalkLocation(dogId: string, c: Coords) {
  const { error } = await supabase.rpc('update_walk_location', { p_dog_id: dogId, p_lat: c.lat, p_lng: c.lng });
  return { error: error?.message ?? null };
}

export async function endWalk(dogId: string) {
  const { error } = await supabase.rpc('end_walk', { p_dog_id: dogId });
  return { error: error?.message ?? null };
}

export async function nearbyDogs(c: Coords, radiusM: number) {
  const { data, error } = await supabase.rpc('nearby_active_dogs', { p_lat: c.lat, p_lng: c.lng, p_radius_m: radiusM });
  return { data: (data as NearbyDog[]) ?? [], error: error?.message ?? null };
}
