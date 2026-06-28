import { supabase } from '../lib/supabase';
import type { Walker } from '../types/walker';

export async function availableWalkers(city = '') {
  const { data, error } = await supabase.rpc('available_walkers', { p_city: city });
  return { data: (data as Walker[]) ?? [], error: error?.message ?? null };
}

export async function getWalkerStatus(userId: string) {
  const { data: row, error } = await supabase.from('profiles').select('is_walker').eq('id', userId).single();
  return { data: (row?.is_walker ?? false) as boolean, error: error?.message ?? null };
}

export async function setWalker(userId: string, value: boolean) {
  const { error } = await supabase.from('profiles').update({ is_walker: value }).eq('id', userId);
  return { error: error?.message ?? null };
}

export async function startConversation(otherId: string) {
  const { data, error } = await supabase.rpc('get_or_create_conversation', { p_other: otherId });
  return { data: (data as string | null), error: error?.message ?? null };
}
