-- Multiple photos per user and per dog (social galleries).
-- dog_id null = an owner/profile photo; otherwise a photo of that dog.

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete cascade,
  photo_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists gallery_photos_dog_idx on public.gallery_photos (dog_id, created_at desc);
create index if not exists gallery_photos_owner_idx on public.gallery_photos (owner_id, created_at desc);

alter table public.gallery_photos enable row level security;
drop policy if exists "gallery_select_all" on public.gallery_photos;
create policy "gallery_select_all" on public.gallery_photos for select using (true);
drop policy if exists "gallery_insert_own" on public.gallery_photos;
create policy "gallery_insert_own" on public.gallery_photos for insert with check (auth.uid() = owner_id);
drop policy if exists "gallery_delete_own" on public.gallery_photos;
create policy "gallery_delete_own" on public.gallery_photos for delete using (auth.uid() = owner_id);

-- Photos for one dog (respects discoverability + blocks for other users' dogs).
create or replace function public.list_dog_photos(p_dog_id uuid)
returns table (id uuid, photo_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.id, g.photo_url, g.created_at
  from public.gallery_photos g
  join public.dogs d on d.id = g.dog_id
  join public.profiles p on p.id = d.owner_id
  where g.dog_id = p_dog_id
    and (d.owner_id = auth.uid()
         or (coalesce(p.is_discoverable, true) and not public.is_blocked_with(d.owner_id)))
  order by g.created_at desc limit 60;
$$;

-- Owner/profile photos.
create or replace function public.list_owner_photos(p_owner uuid)
returns table (id uuid, photo_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.id, g.photo_url, g.created_at
  from public.gallery_photos g
  join public.profiles p on p.id = g.owner_id
  where g.owner_id = p_owner and g.dog_id is null
    and (g.owner_id = auth.uid()
         or (coalesce(p.is_discoverable, true) and not public.is_blocked_with(g.owner_id)))
  order by g.created_at desc limit 60;
$$;

revoke execute on function public.list_dog_photos(uuid) from public;
grant execute on function public.list_dog_photos(uuid) to authenticated;
revoke execute on function public.list_owner_photos(uuid) from public;
grant execute on function public.list_owner_photos(uuid) to authenticated;
