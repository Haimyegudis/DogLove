-- Privacy-critical fix: walk_sessions stored PRECISE coordinates and was
-- published over Realtime, so any client could read exact live positions,
-- bypassing the ~110m coarsening. We instead publish a separate pings table
-- that holds ONLY coarsened coordinates, and remove walk_sessions from Realtime.

create table if not exists public.active_walk_pings (
  dog_id uuid primary key references public.dogs (id) on delete cascade,
  lat numeric(8, 3),
  lng numeric(8, 3),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.active_walk_pings enable row level security;
drop policy if exists "ping_select_active_discoverable" on public.active_walk_pings;
create policy "ping_select_active_discoverable" on public.active_walk_pings for select
  using (is_active = true and public.dog_owner_discoverable(dog_id));

-- Mirror every walk_sessions change into the coarse pings table.
create or replace function public.sync_walk_ping()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.active_walk_pings where dog_id = old.dog_id;
    return old;
  end if;
  insert into public.active_walk_pings (dog_id, lat, lng, is_active, updated_at)
  values (
    new.dog_id,
    round(st_y(new.location::geometry)::numeric, 3),
    round(st_x(new.location::geometry)::numeric, 3),
    new.is_active, now()
  )
  on conflict (dog_id) do update
    set lat = excluded.lat, lng = excluded.lng, is_active = excluded.is_active, updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_sync_walk_ping on public.walk_sessions;
create trigger trg_sync_walk_ping
  after insert or update or delete on public.walk_sessions
  for each row execute function public.sync_walk_ping();

-- Backfill from any currently-active session.
insert into public.active_walk_pings (dog_id, lat, lng, is_active, updated_at)
select ws.dog_id,
  round(st_y(ws.location::geometry)::numeric, 3),
  round(st_x(ws.location::geometry)::numeric, 3),
  ws.is_active, now()
from public.walk_sessions ws
where ws.location is not null
on conflict (dog_id) do update set lat = excluded.lat, lng = excluded.lng, is_active = excluded.is_active;

-- Swap Realtime publication: drop the precise table, add the coarse one.
do $$ begin
  begin
    alter publication supabase_realtime drop table public.walk_sessions;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.active_walk_pings;
  exception when duplicate_object then null; end;
end $$;
