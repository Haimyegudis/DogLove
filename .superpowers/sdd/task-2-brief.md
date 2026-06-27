## Task 2: Supabase project + `profiles` table with RLS

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`
- Modify: `.env` (local only, not committed)

**Interfaces:**
- Consumes: nothing in code
- Produces: a live Supabase project, a `profiles` table matching the spec, RLS policies, and a trigger that inserts a `profiles` row on new auth user. Provides `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Task 3.

- [ ] **Step 1: Create the Supabase project (manual)**

In the Supabase dashboard (https://supabase.com): create a new project. Note the **Project URL** and **anon public key** (Project Settings → API). Put them in a local `.env` (copy from `.env.example`). Do **not** commit `.env`.

- [ ] **Step 2: Write the migration SQL**

`supabase/migrations/0001_profiles.sql`:
```sql
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
```

- [ ] **Step 3: Apply the migration**

In the Supabase dashboard → SQL Editor: paste the contents of `0001_profiles.sql` and run it. Expected: "Success. No rows returned." Verify in Table Editor that `profiles` exists with RLS enabled (a shield icon).

- [ ] **Step 4: Enable Google OAuth (manual)**

In Supabase dashboard → Authentication → Providers → Google: enable it and paste a Google OAuth Client ID/secret (created in Google Cloud Console, with the Supabase callback URL as an authorized redirect URI). Also enable Email provider (on by default). Record that this is done.

- [ ] **Step 5: Commit the migration (no secrets)**

```bash
git add supabase/migrations/0001_profiles.sql
git commit -m "feat(db): add profiles table with RLS and new-user trigger"
```

---

