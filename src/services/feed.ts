import { supabase } from '../lib/supabase';
import type { FeedPost } from '../types/feed';

export async function listFeed(limit = 50) {
  const { data, error } = await supabase.rpc('list_feed', { p_limit: limit });
  return { data: (data as FeedPost[]) ?? [], error: error?.message ?? null };
}
export async function createPost(ownerId: string, dogId: string | null, photoUrl: string, caption: string) {
  const { error } = await supabase.from('dog_posts').insert({ owner_id: ownerId, dog_id: dogId, photo_url: photoUrl, caption: caption || null });
  return { error: error?.message ?? null };
}
export async function reactToPost(postId: string, userId: string, emoji: string) {
  const { error } = await supabase.from('post_reactions').upsert({ post_id: postId, user_id: userId, emoji }, { onConflict: 'post_id,user_id' });
  return { error: error?.message ?? null };
}
export async function removeReaction(postId: string, userId: string) {
  const { error } = await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId);
  return { error: error?.message ?? null };
}
