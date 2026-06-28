import { supabase } from '../lib/supabase';
import type { HealthRecord, HealthKind } from '../types/health';

export async function listHealth(dogId: string) {
  const { data, error } = await supabase
    .from('dog_health')
    .select('id, dog_id, kind, label, event_date, notes, created_at')
    .eq('dog_id', dogId)
    .order('event_date', { ascending: false });
  return { data: (data as HealthRecord[]) ?? [], error: error?.message ?? null };
}

export async function addHealth(
  ownerId: string,
  dogId: string,
  kind: HealthKind,
  label: string,
  eventDate: string | null,
  notes: string,
) {
  const { error } = await supabase.from('dog_health').insert({
    owner_id: ownerId,
    dog_id: dogId,
    kind,
    label,
    event_date: eventDate,
    notes: notes || null,
  });
  return { error: error?.message ?? null };
}

export async function deleteHealth(id: string) {
  const { error } = await supabase.from('dog_health').delete().eq('id', id);
  return { error: error?.message ?? null };
}
