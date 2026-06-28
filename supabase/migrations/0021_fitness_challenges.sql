-- ===================================================================
-- Fitness challenges: community walk challenges with progress tracking.
-- ===================================================================

-- ---------- Challenges ----------
create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  goal_kind   text not null check (goal_kind in ('walks', 'distance_km', 'streak_days')),
  goal_target numeric not null,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  created_at  timestamptz default now()
);

alter table public.challenges enable row level security;
drop policy if exists "challenges_select_all" on public.challenges;
create policy "challenges_select_all" on public.challenges for select using (true);
drop policy if exists "challenges_insert_auth" on public.challenges;
create policy "challenges_insert_auth" on public.challenges for insert with check (auth.uid() is not null);

-- ---------- Challenge participants ----------
create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  joined_at    timestamptz default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenge_participants enable row level security;
drop policy if exists "cp_select_all" on public.challenge_participants;
create policy "cp_select_all" on public.challenge_participants for select using (true);
drop policy if exists "cp_insert_own" on public.challenge_participants;
create policy "cp_insert_own" on public.challenge_participants for insert with check (auth.uid() = user_id);
drop policy if exists "cp_delete_own" on public.challenge_participants;
create policy "cp_delete_own" on public.challenge_participants for delete using (auth.uid() = user_id);

-- ---------- list_challenges() ----------
create or replace function public.list_challenges()
returns table (
  id               uuid,
  title            text,
  description      text,
  goal_kind        text,
  goal_target      numeric,
  ends_at          timestamptz,
  participant_count bigint,
  i_joined         boolean,
  my_progress      numeric
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.title,
    c.description,
    c.goal_kind,
    c.goal_target,
    c.ends_at,
    (select count(*) from public.challenge_participants cp where cp.challenge_id = c.id) as participant_count,
    exists (
      select 1 from public.challenge_participants cp
      where cp.challenge_id = c.id and cp.user_id = auth.uid()
    ) as i_joined,
    case c.goal_kind
      when 'walks' then (
        select count(*)::numeric
        from public.walk_log wl
        where wl.owner_id = auth.uid()
          and wl.ended_at >= c.starts_at
          and wl.ended_at <= now()
      )
      when 'distance_km' then (
        select round((coalesce(sum(wl.distance_m), 0) / 1000.0)::numeric, 1)
        from public.walk_log wl
        where wl.owner_id = auth.uid()
          and wl.ended_at >= c.starts_at
          and wl.ended_at <= now()
      )
      when 'streak_days' then (
        select count(distinct (wl.ended_at at time zone 'UTC')::date)::numeric
        from public.walk_log wl
        where wl.owner_id = auth.uid()
          and wl.ended_at >= c.starts_at
          and wl.ended_at <= now()
      )
      else 0
    end as my_progress
  from public.challenges c
  where c.ends_at > now()
  order by c.ends_at asc
  limit 100;
$$;

-- ---------- join_challenge(p_challenge) ----------
create or replace function public.join_challenge(p_challenge uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.challenge_participants (challenge_id, user_id)
  values (p_challenge, auth.uid())
  on conflict do nothing;
end; $$;

-- ---------- leave_challenge(p_challenge) ----------
create or replace function public.leave_challenge(p_challenge uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.challenge_participants
  where challenge_id = p_challenge and user_id = auth.uid();
end; $$;

-- ---------- Permissions ----------
revoke execute on all functions in schema public from public;
grant execute on all functions in schema public to authenticated;
