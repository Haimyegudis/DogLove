import { supabase } from '../lib/supabase';

export function subscribeActiveWalks(onChange: () => void) {
  // Subscribe to the coarse pings table (precise walk_sessions is no longer
  // published over Realtime, for privacy). The payload carries only ~110m
  // coordinates; we use it purely as a "something changed" trigger.
  const channel = supabase
    .channel('active_walk_pings_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'active_walk_pings' }, () => onChange())
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}
