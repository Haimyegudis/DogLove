import { supabase } from '../lib/supabase';

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  return { error: error?.message ?? null };
}
export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  return { error: error?.message ?? null };
}
export async function reportUser(reporterId: string, reportedId: string, reason: string) {
  const { error } = await supabase.from('reports').insert({ reporter_id: reporterId, reported_id: reportedId, reason: reason || null });
  return { error: error?.message ?? null };
}
