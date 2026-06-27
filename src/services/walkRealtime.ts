import { supabase } from '../lib/supabase';

export function subscribeActiveWalks(onChange: () => void) {
  const channel = supabase
    .channel('walk_sessions_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'walk_sessions' }, () => onChange())
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}
