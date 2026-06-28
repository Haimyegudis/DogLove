import { supabase } from '../lib/supabase';

export interface Badge {
  code: string;
  label: string;
  emoji: string;
  earned: boolean;
  progress: number;
  target: number;
}

export async function myBadges(): Promise<{ data: Badge[] | null; error: string | null }> {
  const { data, error } = await supabase.rpc('my_badges');
  return { data: (data ?? null) as Badge[] | null, error: error?.message ?? null };
}
