-- profiles: one row per authenticated user
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  photo_url text,
  bio text,
  push_token text,
  is_discoverable boolean not null default true,
  auth_provider text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- a user can read their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- a user can update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- a user can insert their own profile row (fallback to trigger)
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- auto-create a profile row when a new auth user is created
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, auth_provider)
  values (new.id, new.raw_app_meta_data ->> 'provider')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
