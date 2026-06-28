import { supabase } from '../lib/supabase';
import type { Dog } from '../types/profile';

const COLUMNS = 'id, owner_id, name, breed, age, size, gender, photo_url, bio';

export interface DogCard {
  dog_id: string;
  name: string;
  breed: string;
  age: number;
  size: string | null;
  gender: string | null;
  photo_url: string | null;
  bio: string | null;
  owner_id: string;
  owner_name: string | null;
  owner_photo: string | null;
}

// Read-only public card for another owner's dog (e.g. after a playdate).
export async function getDogCard(dogId: string) {
  const { data, error } = await supabase.rpc('get_dog_card', { p_dog_id: dogId });
  const row = (data as DogCard[])?.[0] ?? null;
  return { data: row, error: error?.message ?? null };
}

export async function listMyDogs(ownerId: string) {
  const { data, error } = await supabase
    .from('dogs')
    .select(COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  return { data: (data as Dog[]) ?? [], error: error?.message ?? null };
}

export async function createDog(ownerId: string, dog: Omit<Dog, 'id' | 'owner_id'>) {
  const { error } = await supabase.from('dogs').insert({ owner_id: ownerId, ...dog });
  return { error: error?.message ?? null };
}

export async function updateDog(id: string, patch: Partial<Dog>) {
  const { error } = await supabase.from('dogs').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteDog(id: string) {
  const { error } = await supabase.from('dogs').delete().eq('id', id);
  return { error: error?.message ?? null };
}
