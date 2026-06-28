import { supabase } from '../lib/supabase';

export interface VerificationStatus {
  verified: boolean;
  has_photo: boolean;
  has_dog: boolean;
  walk_count: number;
  walks_needed: number;
}

/**
 * Check whether a specific user has earned the Verified Owner badge.
 * Calls the server-side RPC so the logic stays authoritative and cannot
 * be spoofed client-side.
 */
export async function isVerified(
  userId: string,
): Promise<{ data: boolean | null; error: string | null }> {
  const { data, error } = await supabase.rpc('is_verified_owner', {
    p_user: userId,
  });
  return {
    data: typeof data === 'boolean' ? data : null,
    error: error?.message ?? null,
  };
}

/**
 * Fetch the calling user's verification progress (requires an active session).
 * Returns a single row from verification_status().
 */
export async function myVerificationStatus(): Promise<{
  data: VerificationStatus | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('verification_status');
  // rpc() for a RETURNS TABLE wraps the rows in an array; we want the first row.
  const row = Array.isArray(data) ? (data[0] as VerificationStatus) ?? null : null;
  return { data: row, error: error?.message ?? null };
}
