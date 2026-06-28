import { supabase } from '../lib/supabase';

export interface CompatibilityResult {
  score: number;
  reasons: string[];
}

/**
 * Fetch the compatibility score between two dogs via the dog_compatibility RPC.
 * Returns the first (and only) row as a CompatibilityResult, or null on error.
 */
export async function compatibility(
  dogA: string,
  dogB: string,
): Promise<{ data: CompatibilityResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('dog_compatibility', {
    p_dog_a: dogA,
    p_dog_b: dogB,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const row = Array.isArray(data) ? (data[0] as CompatibilityResult | undefined) : null;
  return { data: row ?? null, error: null };
}
