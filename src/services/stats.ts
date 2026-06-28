import { supabase } from '../lib/supabase';
import type { WalkStats } from '../types/stats';

export async function myWalkStats() {
  const { data, error } = await supabase.rpc('my_walk_stats');
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row ?? null) as WalkStats | null, error: error?.message ?? null };
}
