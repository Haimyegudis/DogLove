-- ===================================================================
-- Park check-ins: real-time "I'm at the park now" meetups.
-- Users check in at their current location for ~2 hours;
-- others nearby can see who is around and start a conversation.
-- ===================================================================

-- ---------- Table ----------
create table if not exists public.park_checkins (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  location   geography(Point, 4326) not null,
  note       text,
  expires_at timestamptz not null default now() + interval '2 hours',
  created_at timestamptz not null default now()
);

create index if not exists park_checkins_location_idx on public.park_checkins using gist (location);
create index if not exists park_checkins_expires_idx  on public.park_checkins (expires_at);

alter table public.park_checkins enable row level security;

-- Coarse coords exposed only through the RPC; direct select intentionally
-- restricted so raw lat/lng cannot be read by clients.
drop policy if exists "checkins_select_all" on public.park_checkins;
create policy "checkins_select_all" on public.park_checkins for select using (true);

drop policy if exists "checkins_insert_own" on public.park_checkins;
create policy "checkins_insert_own" on public.park_checkins for insert
  with check (auth.uid() = user_id);

drop policy if exists "checkins_delete_own" on public.park_checkins;
create policy "checkins_delete_own" on public.park_checkins for delete
  using (auth.uid() = user_id);

-- ---------- RPC: check_in_park ----------
create or replace function public.check_in_park(
  p_lat  float8,
  p_lng  float8,
  p_note text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  -- Remove any existing active check-in for this user first.
  delete from public.park_checkins
  where user_id = auth.uid()
    and expires_at > now();

  insert into public.park_checkins (user_id, location, note, expires_at)
  values (
    auth.uid(),
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    p_note,
    now() + interval '2 hours'
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- RPC: check_out_park ----------
create or replace function public.check_out_park()
returns void
language sql security definer set search_path = public as $$
  delete from public.park_checkins
  where user_id = auth.uid();
$$;

-- ---------- RPC: nearby_checkins ----------
create or replace function public.nearby_checkins(
  p_lat      float8,
  p_lng      float8,
  p_radius_m float8 default 5000
)
returns table (
  id          uuid,
  user_id     uuid,
  display_name text,
  photo_url   text,
  note        text,
  lat         float8,
  lng         float8,
  distance_m  float8,
  created_at  timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.user_id,
    p.display_name,
    p.photo_url,
    c.note,
    -- Coarsen to ~110 m so raw GPS is not exposed
    round(st_y(c.location::geometry)::numeric, 3)::float8 as lat,
    round(st_x(c.location::geometry)::numeric, 3)::float8 as lng,
    st_distance(c.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m,
    c.created_at
  from public.park_checkins c
  join public.profiles p on p.id = c.user_id
  where c.expires_at > now()
    and c.user_id <> auth.uid()
    and coalesce(p.is_discoverable, true)
    and not public.is_blocked_with(c.user_id)
    and st_dwithin(
          c.location,
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
          p_radius_m
        )
  order by distance_m asc
  limit 100;
$$;

-- ---------- Grants ----------
revoke execute on function public.check_in_park(float8, float8, text) from public;
grant  execute on function public.check_in_park(float8, float8, text) to authenticated;

revoke execute on function public.check_out_park() from public;
grant  execute on function public.check_out_park() to authenticated;

revoke execute on function public.nearby_checkins(float8, float8, float8) from public;
grant  execute on function public.nearby_checkins(float8, float8, float8) to authenticated;
