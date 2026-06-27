import { supabase } from '../lib/supabase';
import type { OwnerProfile } from '../types/profile';

export async function ensureProfile(userId: string, provider?: string) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, auth_provider: provider }, { onConflict: 'id', ignoreDuplicates: true });
  return { error: error?.message ?? null };
}

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url, date_of_birth, gender, bio')
    .eq('id', userId)
    .single();
  return { data: (data as OwnerProfile) ?? null, error: error?.message ?? null };
}

export async function saveMyProfile(userId: string, patch: Partial<OwnerProfile>) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch }, { onConflict: 'id' });
  return { error: error?.message ?? null };
}
