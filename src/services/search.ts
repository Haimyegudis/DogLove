import { supabase } from '../lib/supabase';
import type { BrowseDog } from '../types/match';
import type { UserResult } from '../types/search';

export async function searchDogs(q: string, city = '') {
  const { data, error } = await supabase.rpc('search_dogs', { p_q: q, p_city: city });
  return { data: (data as BrowseDog[]) ?? [], error: error?.message ?? null };
}

export async function searchUsers(q: string, gender: string | null, minAge: number, maxAge: number, city = '') {
  const { data, error } = await supabase.rpc('search_users', { p_q: q, p_gender: gender, p_min_age: minAge, p_max_age: maxAge, p_city: city });
  return { data: (data as UserResult[]) ?? [], error: error?.message ?? null };
}
