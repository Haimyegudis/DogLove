import { supabase } from '../lib/supabase';

export interface DiscoverOwner {
  user_id: string;
  display_name: string | null;
  photo_url: string | null;
  city: string | null;
  gender: string | null;
  age: number | null;
  intent: string[] | null;
  top_dog_photo: string | null;
  top_dog_name: string | null;
}

export interface SwipeResult {
  matched: boolean;
  conversation_id: string | null;
}

export async function discoverOwners(limit = 30) {
  const { data, error } = await supabase.rpc('discover_owners', { p_limit: limit });
  return { data: (data as DiscoverOwner[]) ?? [], error: error?.message ?? null };
}

export async function swipeOwner(likedId: string, like: boolean) {
  const { data, error } = await supabase.rpc('swipe_owner', { p_liked: likedId, p_like: like });
  return { data: (data as SwipeResult[])?.[0] ?? null, error: error?.message ?? null };
}
