import { supabase } from '../lib/supabase';

export async function getDiscoverable() {
  const { data, error } = await supabase.rpc('get_my_settings');
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row?.is_discoverable ?? true) as boolean, error: error?.message ?? null };
}

export async function setDiscoverable(userId: string, value: boolean) {
  const { error } = await supabase.from('profiles').update({ is_discoverable: value }).eq('id', userId);
  return { error: error?.message ?? null };
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  return { error: error?.message ?? null };
}
