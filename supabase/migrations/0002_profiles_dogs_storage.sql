-- 1. Owner profile: add date_of_birth + gender (age is derived, not stored)
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists gender text;

-- 2. Server-side 18+ enforcement (backs the client gate from Plan 01)
create or replace function public.enforce_adult_profile()
returns trigger language plpgsql as $$
begin
  if new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '18 years') then
    raise exception 'Owner must be at least 18 years old';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_adult_profile on public.profiles;
create trigger trg_enforce_adult_profile
  before insert or update on public.profiles
  for each row execute function public.enforce_adult_profile();

-- 3. dogs table
create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  breed text not null,        -- the dog's "type"
  age int not null,
  size text,                  -- 'S' | 'M' | 'L' (optional)
  photo_url text not null,
  bio text,                   -- description (optional)
  created_at timestamptz not null default now()
);

create index if not exists dogs_owner_id_idx on public.dogs (owner_id);
create index if not exists dogs_breed_idx on public.dogs (breed);

alter table public.dogs enable row level security;

-- Dogs are world-readable (map/matchmaking later); writes are owner-only.
drop policy if exists "dogs_select_all" on public.dogs;
create policy "dogs_select_all" on public.dogs for select using (true);

drop policy if exists "dogs_insert_own" on public.dogs;
create policy "dogs_insert_own" on public.dogs for insert
  with check (auth.uid() = owner_id);

drop policy if exists "dogs_update_own" on public.dogs;
create policy "dogs_update_own" on public.dogs for update
  using (auth.uid() = owner_id);

drop policy if exists "dogs_delete_own" on public.dogs;
create policy "dogs_delete_own" on public.dogs for delete
  using (auth.uid() = owner_id);

-- 4. Storage buckets for photos (public read)
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('dog-photos', 'dog-photos', true)
  on conflict (id) do nothing;

-- Storage policies: anyone can read; a user may write only inside a folder
-- named after their own uid (path = "<uid>/<file>").
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects for select
  using (bucket_id in ('avatars', 'dog-photos'));

drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own" on storage.objects for insert
  with check (
    bucket_id in ('avatars', 'dog-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update
  using (
    bucket_id in ('avatars', 'dog-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
