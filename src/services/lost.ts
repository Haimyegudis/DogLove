import { supabase } from '../lib/supabase';
import type { LostDog } from '../types/lost';

export async function reportLostDog(
  dogId: string | null,
  dogName: string,
  photoUrl: string | null,
  note: string,
  coords: { lat: number; lng: number } | null,
) {
  const { error } = await supabase.rpc('report_lost_dog', {
    p_dog_id: dogId,
    p_dog_name: dogName,
    p_photo_url: photoUrl,
    p_note: note,
    p_lat: coords?.lat ?? null,
    p_lng: coords?.lng ?? null,
  });
  return { error: error?.message ?? null };
}

export async function nearbyLostDogs(
  coords: { lat: number; lng: number },
  radiusM = 50000,
) {
  const { data, error } = await supabase.rpc('nearby_lost_dogs', {
    p_lat: coords.lat,
    p_lng: coords.lng,
    p_radius_m: radiusM,
  });
  return { data: (data as LostDog[]) ?? [], error: error?.message ?? null };
}

export async function markFound(id: string) {
  const { error } = await supabase
    .from('lost_dogs')
    .update({ is_found: true })
    .eq('id', id);
  return { error: error?.message ?? null };
}
