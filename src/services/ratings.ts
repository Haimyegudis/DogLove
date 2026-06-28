import { supabase } from '../lib/supabase';

export async function rateUser(
  raterId: string,
  ratedId: string,
  stars: number,
  comment = ''
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_ratings')
    .upsert(
      { rater_id: raterId, rated_id: ratedId, stars, comment: comment || null },
      { onConflict: 'rater_id,rated_id' }
    );
  return { error: error?.message ?? null };
}

export async function getUserRating(
  userId: string
): Promise<{ data: { avg_stars: number; rating_count: number } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('user_rating', { p_user: userId });
  return {
    data: data?.[0] ?? null,
    error: error?.message ?? null,
  };
}
