import { supabase } from '../lib/supabase';

/** Returns whether the currently authenticated user is premium. */
export async function amIPremium(): Promise<{ data: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('am_i_premium');
  return { data: (data as boolean) ?? false, error: error?.message ?? null };
}

/** Upgrades (on=true) or downgrades (on=false) the currently authenticated user. */
export async function setPremium(on: boolean): Promise<{ data: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('set_premium', { p_on: on });
  return { data: (data as boolean) ?? on, error: error?.message ?? null };
}
