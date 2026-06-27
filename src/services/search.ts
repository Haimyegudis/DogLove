import { supabase } from '../lib/supabase';
import type { BrowseDog } from '../types/match';
import type { UserResult } from '../types/search';

export async function searchDogs(q: string) {
  const { data, error } = await supabase.rpc('search_dogs', { p_q: q });
  return { data: (data as BrowseDog[]) ?? [], error: error?.message ?? null };
}

export async function searchUsers(gender: string | null, minAge: number, maxAge: number) {
  const { data, error } = await supabase.rpc('search_users', { p_gender: gender, p_min_age: minAge, p_max_age: maxAge });
  return { data: (data as UserResult[]) ?? [], error: error?.message ?? null };
}
