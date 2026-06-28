-- ===================================================================
-- Features wave: lost-dog alerts, walk stats/streaks, dog health records,
-- user ratings, group walks/events.
-- ===================================================================

-- ---------- Lost-dog alerts ----------
create table if not exists public.lost_dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete set null,
  dog_name text,
  photo_url text,
  note text,
  location geography(Point, 4326),
  is_found boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists lost_dogs_active_idx on public.lost_dogs (is_found, created_at desc);
alter table public.lost_dogs enable row level security;
drop policy if exists "lost_select_all" on public.lost_dogs;
create policy "lost_select_all" on public.lost_dogs for select using (true);
drop policy if exists "lost_insert_own" on public.lost_dogs;
create policy "lost_insert_own" on public.lost_dogs for insert with check (auth.uid() = owner_id);
drop policy if exists "lost_update_own" on public.lost_dogs;
create policy "lost_update_own" on public.lost_dogs for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.report_lost_dog(p_dog_id uuid, p_dog_name text, p_photo_url text, p_note text, p_lat float8, p_lng float8)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; r record;
begin
  insert into public.lost_dogs (owner_id, dog_id, dog_name, photo_url, note, location)
  values (auth.uid(), p_dog_id, p_dog_name, p_photo_url, p_note,
          case when p_lat is null then null else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end)
  returning id into v_id;
  -- community alert: push every other user who has a token (urgent, app-wide).
  for r in select push_token from public.profiles where id <> auth.uid() and push_token is not null loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object('to', r.push_token, 'title', '🚨 כלב נעדר!',
        'body', coalesce(p_dog_name, 'כלב') || ' נעדר בקרבתך. אפשר לעזור?', 'sound', 'default'),
      headers := jsonb_build_object('Content-Type', 'application/json'));
  end loop;
  return v_id;
end; $$;

create or replace function public.nearby_lost_dogs(p_lat float8, p_lng float8, p_radius_m float8 default 50000)
returns table (id uuid, dog_name text, photo_url text, note text, lat float8, lng float8,
  owner_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.dog_name, l.photo_url, l.note,
    st_y(l.location::geometry), st_x(l.location::geometry), p.display_name, l.created_at
  from public.lost_dogs l
  join public.profiles p on p.id = l.owner_id
  where l.is_found = false
    and (l.location is null or st_dwithin(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m))
  order by l.created_at desc limit 100;
$$;

-- ---------- Walk stats / streaks ----------
alter table public.walk_sessions add column if not exists started_at timestamptz;

create table if not exists public.walk_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz not null default now(),
  distance_m float8 not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists walk_log_owner_idx on public.walk_log (owner_id, ended_at desc);
alter table public.walk_log enable row level security;
drop policy if exists "walklog_select_own" on public.walk_log;
create policy "walklog_select_own" on public.walk_log for select using (auth.uid() = owner_id);

-- start_walk now stamps started_at.
create or replace function public.start_walk(p_dog_id uuid, p_lat float8, p_lng float8)
returns void language sql as $$
  insert into public.walk_sessions (dog_id, is_active, location, updated_at, started_at)
  values (p_dog_id, true, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, now(), now())
  on conflict (dog_id) do update
    set is_active = true,
        location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        updated_at = now(), started_at = now();
$$;

-- end_walk now logs the completed walk (distance passed by the client).
create or replace function public.end_walk(p_dog_id uuid, p_distance_m float8 default 0)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_started timestamptz;
begin
  select d.owner_id, ws.started_at into v_owner, v_started
  from public.walk_sessions ws join public.dogs d on d.id = ws.dog_id
  where ws.dog_id = p_dog_id;
  update public.walk_sessions set is_active = false, updated_at = now() where dog_id = p_dog_id;
  if v_owner = auth.uid() and v_started is not null then
    insert into public.walk_log (owner_id, dog_id, started_at, ended_at, distance_m)
    values (v_owner, p_dog_id, v_started, now(), coalesce(p_distance_m, 0));
  end if;
end; $$;

create or replace function public.my_walk_stats()
returns table (total_walks bigint, total_minutes bigint, week_walks bigint, total_km numeric, streak_days int)
language sql stable security definer set search_path = public as $$
  with w as (select * from public.walk_log where owner_id = auth.uid()),
  days as (select distinct (ended_at at time zone 'UTC')::date d from w)
  select
    (select count(*) from w),
    (select coalesce(sum(extract(epoch from (ended_at - started_at))/60), 0)::bigint from w where started_at is not null),
    (select count(*) from w where ended_at > now() - interval '7 days'),
    (select round(coalesce(sum(distance_m), 0)/1000.0, 1) from w),
    (select count(*)::int from days where d > current_date - interval '30 days'); -- simple active-days proxy
$$;

-- ---------- Dog health records ----------
create table if not exists public.dog_health (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  dog_id uuid not null references public.dogs (id) on delete cascade,
  kind text not null check (kind in ('vaccine','vet','weight','med','note')),
  label text not null,
  event_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists dog_health_dog_idx on public.dog_health (dog_id, event_date desc);
alter table public.dog_health enable row level security;
drop policy if exists "health_select_own" on public.dog_health;
create policy "health_select_own" on public.dog_health for select using (auth.uid() = owner_id);
drop policy if exists "health_insert_own" on public.dog_health;
create policy "health_insert_own" on public.dog_health for insert with check (auth.uid() = owner_id);
drop policy if exists "health_delete_own" on public.dog_health;
create policy "health_delete_own" on public.dog_health for delete using (auth.uid() = owner_id);

-- ---------- User ratings ----------
create table if not exists public.user_ratings (
  rater_id uuid not null references public.profiles (id) on delete cascade,
  rated_id uuid not null references public.profiles (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  primary key (rater_id, rated_id)
);
alter table public.user_ratings enable row level security;
drop policy if exists "ratings_select_all" on public.user_ratings;
create policy "ratings_select_all" on public.user_ratings for select using (true);
drop policy if exists "ratings_upsert_own" on public.user_ratings;
create policy "ratings_upsert_own" on public.user_ratings for insert with check (auth.uid() = rater_id and rater_id <> rated_id);
drop policy if exists "ratings_update_own" on public.user_ratings;
create policy "ratings_update_own" on public.user_ratings for update using (auth.uid() = rater_id) with check (auth.uid() = rater_id);

create or replace function public.user_rating(p_user uuid)
returns table (avg_stars numeric, rating_count bigint)
language sql stable security definer set search_path = public as $$
  select round(coalesce(avg(stars), 0), 1), count(*) from public.user_ratings where rated_id = p_user;
$$;

-- ---------- Group walks / events ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  location_name text,
  location geography(Point, 4326),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists events_starts_idx on public.events (starts_at);
alter table public.events enable row level security;
drop policy if exists "events_select_all" on public.events;
create policy "events_select_all" on public.events for select using (true);
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events for insert with check (auth.uid() = organizer_id);
drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events for delete using (auth.uid() = organizer_id);

create table if not exists public.event_attendees (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (event_id, user_id)
);
alter table public.event_attendees enable row level security;
drop policy if exists "att_select_all" on public.event_attendees;
create policy "att_select_all" on public.event_attendees for select using (true);
drop policy if exists "att_insert_own" on public.event_attendees;
create policy "att_insert_own" on public.event_attendees for insert with check (auth.uid() = user_id);
drop policy if exists "att_delete_own" on public.event_attendees;
create policy "att_delete_own" on public.event_attendees for delete using (auth.uid() = user_id);

create or replace function public.list_events()
returns table (id uuid, title text, location_name text, starts_at timestamptz,
  organizer_name text, attendee_count bigint, i_joined boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.location_name, e.starts_at, p.display_name,
    (select count(*) from public.event_attendees a where a.event_id = e.id),
    exists (select 1 from public.event_attendees a where a.event_id = e.id and a.user_id = auth.uid())
  from public.events e join public.profiles p on p.id = e.organizer_id
  where e.starts_at > now() - interval '1 day'
  order by e.starts_at asc limit 100;
$$;
