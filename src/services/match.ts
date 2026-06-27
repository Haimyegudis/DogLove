import { supabase } from '../lib/supabase';
import type { BrowseDog, PlaydateRequestRow } from '../types/match';

export async function browseDogs(limit = 50) {
  const { data, error } = await supabase.rpc('browse_dogs', { p_limit: limit });
  return { data: (data as BrowseDog[]) ?? [], error: error?.message ?? null };
}

export async function sendPlaydateRequest(fromDogId: string, toDogId: string) {
  const { error } = await supabase.from('playdate_requests').insert({ from_dog_id: fromDogId, to_dog_id: toDogId });
  return { error: error?.message ?? null };
}

export async function listIncoming() {
  const { data, error } = await supabase.rpc('incoming_requests');
  return { data: (data as PlaydateRequestRow[]) ?? [], error: error?.message ?? null };
}

export async function listOutgoing() {
  const { data, error } = await supabase.rpc('outgoing_requests');
  return { data: (data as PlaydateRequestRow[]) ?? [], error: error?.message ?? null };
}

export async function respondToRequest(requestId: string, accept: boolean) {
  const { error } = await supabase.rpc('respond_to_request', { p_request_id: requestId, p_accept: accept });
  return { error: error?.message ?? null };
}
