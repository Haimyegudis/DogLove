import { supabase } from '../lib/supabase';
import type { PlaydateRow } from '../types/playdate';

export async function schedulePlaydate(organizerId: string, guestId: string, startsAtISO: string, locationName: string) {
  const { error } = await supabase.from('scheduled_playdates').insert({
    organizer_id: organizerId, guest_id: guestId, starts_at: startsAtISO, location_name: locationName,
  });
  return { error: error?.message ?? null };
}

export async function listMyPlaydates() {
  const { data, error } = await supabase.rpc('list_my_playdates');
  return { data: (data as PlaydateRow[]) ?? [], error: error?.message ?? null };
}

export async function cancelPlaydate(id: string) {
  const { error } = await supabase.from('scheduled_playdates').update({ status: 'cancelled' }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function otherInConversation(conversationId: string) {
  const { data, error } = await supabase.rpc('conversation_other', { p_conv: conversationId });
  return { data: (data as string | null) ?? null, error: error?.message ?? null };
}
