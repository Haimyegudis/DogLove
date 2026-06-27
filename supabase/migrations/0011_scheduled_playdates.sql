create table if not exists public.scheduled_playdates (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  location_name text,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  created_at timestamptz not null default now()
);
create index if not exists sp_participants_idx on public.scheduled_playdates (organizer_id, guest_id);

alter table public.scheduled_playdates enable row level security;

drop policy if exists "sp_select_party" on public.scheduled_playdates;
create policy "sp_select_party" on public.scheduled_playdates for select
  using (auth.uid() = organizer_id or auth.uid() = guest_id);

drop policy if exists "sp_insert_organizer" on public.scheduled_playdates;
create policy "sp_insert_organizer" on public.scheduled_playdates for insert
  with check (auth.uid() = organizer_id);

drop policy if exists "sp_update_party" on public.scheduled_playdates;
create policy "sp_update_party" on public.scheduled_playdates for update
  using (auth.uid() = organizer_id or auth.uid() = guest_id)
  with check (auth.uid() = organizer_id or auth.uid() = guest_id);

create or replace function public.conversation_other(p_conv uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case when c.owner_a_id = auth.uid() then c.owner_b_id else c.owner_a_id end
  from public.conversations c
  where c.id = p_conv and (c.owner_a_id = auth.uid() or c.owner_b_id = auth.uid());
$$;

create or replace function public.list_my_playdates()
returns table (id uuid, starts_at timestamptz, location_name text, status text,
  other_name text, other_photo text, is_organizer boolean)
language sql stable security definer set search_path = public as $$
  select sp.id, sp.starts_at, sp.location_name, sp.status,
    other.display_name, other.photo_url, (sp.organizer_id = auth.uid())
  from public.scheduled_playdates sp
  join public.profiles other
    on other.id = case when sp.organizer_id = auth.uid() then sp.guest_id else sp.organizer_id end
  where sp.organizer_id = auth.uid() or sp.guest_id = auth.uid()
  order by sp.starts_at asc;
$$;
