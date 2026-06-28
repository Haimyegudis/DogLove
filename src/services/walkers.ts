import { supabase } from '../lib/supabase';
import type { Walker } from '../types/walker';
import type { Coords } from '../types/walk';

export async function availableWalkers(city = '') {
  const { data, error } = await supabase.rpc('available_walkers', { p_city: city });
  return { data: (data as Walker[]) ?? [], error: error?.message ?? null };
}

// Walkers within radius of a point, nearest first (each row carries distance_m).
export async function nearbyWalkers(c: Coords, radiusM: number) {
  const { data, error } = await supabase.rpc('nearby_walkers', { p_lat: c.lat, p_lng: c.lng, p_radius_m: radiusM });
  return { data: (data as Walker[]) ?? [], error: error?.message ?? null };
}

export async function getWalkerStatus(userId: string) {
  const { data: row, error } = await supabase.from('profiles').select('is_walker').eq('id', userId).single();
  return { data: (row?.is_walker ?? false) as boolean, error: error?.message ?? null };
}

// Toggle walker mode. Pass coords to also stamp the walker's location so they
// show up in radius search; omit to flip the flag only.
export async function setWalker(_userId: string, value: boolean, coords?: Coords | null) {
  const { error } = await supabase.rpc('set_walker', {
    p_on: value,
    p_lat: coords?.lat ?? null,
    p_lng: coords?.lng ?? null,
  });
  return { error: error?.message ?? null };
}

export async function startConversation(otherId: string) {
  const { data, error } = await supabase.rpc('get_or_create_conversation', { p_other: otherId });
  return { data: (data as string | null), error: error?.message ?? null };
}
