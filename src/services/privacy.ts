import { supabase } from '../lib/supabase';

export async function getSettings() {
  const { data, error } = await supabase.rpc('get_my_settings');
  const row = Array.isArray(data) ? data[0] : data;
  return {
    data: {
      isDiscoverable: (row?.is_discoverable ?? true) as boolean,
      shareHomeArea: (row?.share_home_area ?? false) as boolean,
    },
    error: error?.message ?? null,
  };
}

export async function getDiscoverable() {
  const { data, error } = await getSettings();
  return { data: data.isDiscoverable, error };
}

export async function setDiscoverable(userId: string, value: boolean) {
  const { error } = await supabase.from('profiles').update({ is_discoverable: value }).eq('id', userId);
  return { error: error?.message ?? null };
}

// Opt in/out of stamping an approximate home area for nearby feed sorting.
// Turning it off also forgets the stored location server-side.
export async function setShareHomeArea(value: boolean) {
  const { error } = await supabase.rpc('set_share_home_area', { p_on: value });
  return { error: error?.message ?? null };
}

// Stamp the current home area. Server no-ops unless share_home_area is on, so
// this is safe to call right after opting in.
export async function stampHomeArea(lat: number, lng: number) {
  const { error } = await supabase.rpc('set_home_location', { p_lat: lat, p_lng: lng });
  return { error: error?.message ?? null };
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  return { error: error?.message ?? null };
}

// Right-to-access export: returns the caller's own data as a single JSON
// document (profile, dogs, posts, sent messages, playdates, check-ins,
// lost-dog reports, walk history, ratings given). Backed by the
// export_my_data() SECURITY DEFINER function.
export async function exportMyData() {
  const { data, error } = await supabase.rpc('export_my_data');
  return { data, error };
}
