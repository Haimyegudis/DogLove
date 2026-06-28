-- Owner-first dating: likes, mutual-match → conversation, and a discover deck.

-- Who liked whom. A row means liker_id swiped right on liked_id.
create table if not exists public.owner_likes (
  liker_id uuid not null references public.profiles (id) on delete cascade,
  liked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, liked_id),
  check (liker_id <> liked_id)
);

alter table public.owner_likes enable row level security;

-- I can see likes I sent or received; only I can create/remove my own likes.
drop policy if exists "owner_likes_select" on public.owner_likes;
create policy "owner_likes_select" on public.owner_likes for select
  using (auth.uid() = liker_id or auth.uid() = liked_id);

drop policy if exists "owner_likes_insert" on public.owner_likes;
create policy "owner_likes_insert" on public.owner_likes for insert
  with check (auth.uid() = liker_id);

drop policy if exists "owner_likes_delete" on public.owner_likes;
create policy "owner_likes_delete" on public.owner_likes for delete
  using (auth.uid() = liker_id);

-- Swipe on an owner. p_like=false is a skip (no-op, no row). p_like=true records
-- the like; if the target already liked me back it's a mutual match and we
-- create/get a conversation (same normalized-pair logic as
-- get_or_create_conversation). Returns whether it matched and the conversation id.
create or replace function public.swipe_owner(p_liked uuid, p_like boolean)
returns table (matched boolean, conversation_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_reciprocal boolean;
  v_a uuid := least(auth.uid(), p_liked);
  v_b uuid := greatest(auth.uid(), p_liked);
  v_conv uuid;
begin
  if p_liked = v_me then raise exception 'cannot swipe self'; end if;
  if public.is_blocked_with(p_liked) then raise exception 'blocked'; end if;

  -- Skip: do nothing, return no match.
  if p_like is not true then
    return query select false, null::uuid;
    return;
  end if;

  -- Record my like (idempotent).
  insert into public.owner_likes (liker_id, liked_id) values (v_me, p_liked)
    on conflict (liker_id, liked_id) do nothing;

  -- Did they already like me back?
  select exists (
    select 1 from public.owner_likes
    where liker_id = p_liked and liked_id = v_me
  ) into v_reciprocal;

  if not v_reciprocal then
    return query select false, null::uuid;
    return;
  end if;

  -- Mutual match → create/get the conversation for this owner pair.
  insert into public.conversations (owner_a_id, owner_b_id) values (v_a, v_b)
    on conflict (owner_a_id, owner_b_id) do nothing;
  select id into v_conv from public.conversations
    where owner_a_id = v_a and owner_b_id = v_b;

  return query select true, v_conv;
end; $$;

-- The discover deck: discoverable owners I haven't liked yet, with their first
-- dog as an icebreaker. Excludes me, blocked pairs, and ageless profiles.
create or replace function public.discover_owners(p_limit int default 30)
returns table (
  user_id uuid, display_name text, photo_url text, city text,
  gender text, age int, intent text[], top_dog_photo text, top_dog_name text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.city, p.gender,
    extract(year from age(p.date_of_birth))::int as age,
    p.intent, dog.photo_url, dog.name
  from public.profiles p
  left join lateral (
    select d.photo_url, d.name from public.dogs d
    where d.owner_id = p.id order by d.created_at asc limit 1
  ) dog on true
  where p.id <> auth.uid()
    and coalesce(p.is_discoverable, true)
    and p.date_of_birth is not null
    and not public.is_blocked_with(p.id)
    and not exists (
      select 1 from public.owner_likes l
      where l.liker_id = auth.uid() and l.liked_id = p.id
    )
  order by md5(p.id::text || auth.uid()::text)
  limit p_limit;
$$;

revoke execute on function public.swipe_owner(uuid, boolean) from public;
grant execute on function public.swipe_owner(uuid, boolean) to authenticated;
revoke execute on function public.discover_owners(int) from public;
grant execute on function public.discover_owners(int) to authenticated;
