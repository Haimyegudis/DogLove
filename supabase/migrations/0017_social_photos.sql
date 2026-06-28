-- Correct the anon lockdown: revoke from PUBLIC (anon inherits PUBLIC), grant
-- to authenticated, and set the same as the default for future functions.
revoke execute on all functions in schema public from public;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public grant execute on functions to authenticated;

-- ===== Social photos: dog posts + reactions =====
create table if not exists public.dog_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete set null,
  photo_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists dog_posts_created_idx on public.dog_posts (created_at desc);

alter table public.dog_posts enable row level security;
drop policy if exists "posts_select_all" on public.dog_posts;
create policy "posts_select_all" on public.dog_posts for select using (true);
drop policy if exists "posts_insert_own" on public.dog_posts;
create policy "posts_insert_own" on public.dog_posts for insert with check (auth.uid() = owner_id);
drop policy if exists "posts_delete_own" on public.dog_posts;
create policy "posts_delete_own" on public.dog_posts for delete using (auth.uid() = owner_id);

-- one reaction per user per post (emoji is updatable)
create table if not exists public.post_reactions (
  post_id uuid not null references public.dog_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_reactions enable row level security;
drop policy if exists "reactions_select_all" on public.post_reactions;
create policy "reactions_select_all" on public.post_reactions for select using (true);
drop policy if exists "reactions_insert_own" on public.post_reactions;
create policy "reactions_insert_own" on public.post_reactions for insert with check (auth.uid() = user_id);
drop policy if exists "reactions_update_own" on public.post_reactions;
create policy "reactions_update_own" on public.post_reactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "reactions_delete_own" on public.post_reactions;
create policy "reactions_delete_own" on public.post_reactions for delete using (auth.uid() = user_id);

-- Feed: posts + author/dog + reaction count + the caller's own reaction.
create or replace function public.list_feed(p_limit int default 50)
returns table (post_id uuid, photo_url text, caption text, created_at timestamptz,
  owner_id uuid, owner_name text, owner_photo text, dog_name text,
  reaction_count bigint, my_reaction text)
language sql stable security definer set search_path = public as $$
  select p.id, p.photo_url, p.caption, p.created_at,
    p.owner_id, pr.display_name, pr.photo_url, d.name,
    (select count(*) from public.post_reactions r where r.post_id = p.id),
    (select r.emoji from public.post_reactions r where r.post_id = p.id and r.user_id = auth.uid())
  from public.dog_posts p
  join public.profiles pr on pr.id = p.owner_id
  left join public.dogs d on d.id = p.dog_id
  order by p.created_at desc
  limit p_limit;
$$;
