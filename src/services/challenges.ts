import { supabase } from '../lib/supabase';

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  goal_kind: 'walks' | 'distance_km' | 'streak_days';
  goal_target: number;
  ends_at: string;
  participant_count: number;
  i_joined: boolean;
  my_progress: number;
}

export interface CreateChallengeInput {
  title: string;
  description?: string;
  goalKind: 'walks' | 'distance_km' | 'streak_days';
  goalTarget: number;
  endsAt: string;
}

export async function listChallenges() {
  const { data, error } = await supabase.rpc('list_challenges');
  return { data: (data ?? null) as Challenge[] | null, error: error?.message ?? null };
}

export async function joinChallenge(id: string) {
  const { data, error } = await supabase.rpc('join_challenge', { p_challenge: id });
  return { data: data ?? null, error: error?.message ?? null };
}

export async function leaveChallenge(id: string) {
  const { data, error } = await supabase.rpc('leave_challenge', { p_challenge: id });
  return { data: data ?? null, error: error?.message ?? null };
}

export async function createChallenge({ title, description, goalKind, goalTarget, endsAt }: CreateChallengeInput) {
  const { data, error } = await supabase
    .from('challenges')
    .insert({ title, description: description ?? null, goal_kind: goalKind, goal_target: goalTarget, ends_at: endsAt })
    .select()
    .single();
  return { data: data ?? null, error: error?.message ?? null };
}
