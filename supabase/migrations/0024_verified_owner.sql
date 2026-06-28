-- ===================================================================
-- Verified-owner badge: automatic trust score based on observable data.
-- A user is "verified" when they have a profile photo, a confirmed email,
-- at least 1 dog, and at least 3 completed walks in walk_log.
-- ===================================================================

-- ---------- is_verified_owner(p_user) ----------
-- Returns true when all trust criteria are met for the given user.
-- Email-confirmed check uses auth.users via a sub-select; security definer
-- allows access to the auth schema from within the function body.
create or replace function public.is_verified_owner(p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    -- 1. has a profile photo
    (select photo_url from public.profiles where id = p_user) is not null
    -- 2. email is confirmed (auth.users is accessible because security definer
    --    runs as the function owner who has access to auth schema)
    and exists (
      select 1 from auth.users where id = p_user and email_confirmed_at is not null
    )
    -- 3. owns at least one dog
    and exists (
      select 1 from public.dogs where owner_id = p_user
    )
    -- 4. has at least 3 completed walks
    and (
      select count(*) from public.walk_log where owner_id = p_user
    ) >= 3;
$$;

-- ---------- verification_status() ----------
-- Returns the calling user's progress toward verification.
-- walks_needed = greatest(0, 3 - walk_count) so it floors at 0.
create or replace function public.verification_status()
returns table (
  verified      boolean,
  has_photo     boolean,
  has_dog       boolean,
  walk_count    bigint,
  walks_needed  int
)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  photo_check as (
    select (select photo_url from public.profiles where id = (select uid from me)) is not null as has_photo
  ),
  email_check as (
    select exists(
      select 1 from auth.users where id = (select uid from me) and email_confirmed_at is not null
    ) as confirmed
  ),
  dog_check as (
    select exists(
      select 1 from public.dogs where owner_id = (select uid from me)
    ) as has_dog
  ),
  walk_count_cte as (
    select count(*) as walk_count from public.walk_log where owner_id = (select uid from me)
  )
  select
    (pc.has_photo and ec.confirmed and dc.has_dog and wc.walk_count >= 3) as verified,
    pc.has_photo,
    dc.has_dog,
    wc.walk_count,
    greatest(0, 3 - wc.walk_count::int)                                   as walks_needed
  from photo_check pc, email_check ec, dog_check dc, walk_count_cte wc;
$$;

-- ---------- Permissions ----------
revoke all on function public.is_verified_owner(uuid)   from public, anon;
grant  execute on function public.is_verified_owner(uuid)   to authenticated;

revoke all on function public.verification_status()     from public, anon;
grant  execute on function public.verification_status()     to authenticated;
