import { supabase } from '../lib/supabase';

export async function ensureProfile(userId: string, provider?: string) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, auth_provider: provider }, { onConflict: 'id', ignoreDuplicates: true });
  return { error: error?.message ?? null };
}
