import { supabase } from '../lib/supabase';

export interface OwnerCard {
  user_id: string;
  display_name: string | null;
  photo_url: string | null;
  city: string | null;
  gender: string | null;
  age: number | null;
  intent: string[] | null;
}

export interface OwnerDog {
  dog_id: string;
  name: string;
  breed: string;
  age: number;
  photo_url: string | null;
}

export async function getOwnerCard(ownerId: string) {
  const { data, error } = await supabase.rpc('get_owner_card', { p_owner: ownerId });
  return { data: (data as OwnerCard[])?.[0] ?? null, error: error?.message ?? null };
}

export async function listOwnerDogs(ownerId: string) {
  const { data, error } = await supabase.rpc('list_owner_dogs', { p_owner: ownerId });
  return { data: (data as OwnerDog[]) ?? [], error: error?.message ?? null };
}

export async function setIntent(intent: string[]) {
  const { error } = await supabase.rpc('set_intent', { p_intent: intent });
  return { error: error?.message ?? null };
}
