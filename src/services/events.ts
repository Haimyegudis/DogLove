import { supabase } from '../lib/supabase';
import type { SocialWalk } from '../types/event';

export async function listSocialWalks() {
  const { data, error } = await supabase.rpc('list_events');
  return { data: (data as SocialWalk[]) ?? [], error: error?.message ?? null };
}

export async function createSocialWalk(
  organizerId: string,
  title: string,
  locationName: string,
  coords: { lat: number; lng: number } | null,
  startsAtISO: string,
) {
  const { error } = await supabase.from('events').insert({
    organizer_id: organizerId,
    title,
    location_name: locationName || null,
    location: null,
    starts_at: startsAtISO,
  });
  return { error: error?.message ?? null };
}

export async function joinWalk(eventId: string, userId: string) {
  const { error } = await supabase
    .from('event_attendees')
    .insert({ event_id: eventId, user_id: userId });
  return { error: error?.message ?? null };
}

export async function leaveWalk(eventId: string, userId: string) {
  const { error } = await supabase
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
