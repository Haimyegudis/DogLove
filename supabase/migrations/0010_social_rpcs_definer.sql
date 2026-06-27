-- The profiles table is RLS-locked to "own row only" for direct queries.
-- But the social read-RPCs must surface OTHER users' public fields
-- (display_name, photo_url, gender, age). As SECURITY INVOKER they were
-- silently RLS-filtered to nothing. Recreate them as SECURITY DEFINER so the
-- curated queries (which return only safe columns) can read across profiles,
-- while the profiles table itself stays locked for arbitrary client queries.
-- auth.uid() still returns the caller's id inside a definer function, so all
-- ownership/scoping filters remain correct.

create or replace function public.browse_dogs(p_limit int default 50)
returns table (dog_id uuid, name text, breed text, age int, photo_url text, owner_id uuid, owner_name text)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name
  from public.dogs d
  join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid()
  order by d.created_at desc
  limit p_limit;
$$;

create or replace function public.incoming_requests()
returns table (request_id uuid, status text, created_at timestamptz,
  dog_id uuid, dog_name text, dog_breed text, dog_photo text, owner_name text)
language sql stable security definer set search_path = public as $$
  select r.id, r.status, r.created_at, fd.id, fd.name, fd.breed, fd.photo_url, p.display_name
  from public.playdate_requests r
  join public.dogs td on td.id = r.to_dog_id
  join public.dogs fd on fd.id = r.from_dog_id
  join public.profiles p on p.id = fd.owner_id
  where td.owner_id = auth.uid()
  order by r.created_at desc;
$$;

create or replace function public.outgoing_requests()
returns table (request_id uuid, status text, created_at timestamptz,
  dog_id uuid, dog_name text, dog_breed text, dog_photo text, owner_name text)
language sql stable security definer set search_path = public as $$
  select r.id, r.status, r.created_at, td.id, td.name, td.breed, td.photo_url, p.display_name
  from public.playdate_requests r
  join public.dogs fd on fd.id = r.from_dog_id
  join public.dogs td on td.id = r.to_dog_id
  join public.profiles p on p.id = td.owner_id
  where fd.owner_id = auth.uid()
  order by r.created_at desc;
$$;

create or replace function public.list_conversations()
returns table (conversation_id uuid, other_id uuid, other_name text, other_photo text,
  last_body text, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id,
    other.id, other.display_name, other.photo_url,
    lm.body, lm.created_at
  from public.conversations c
  join public.profiles other
    on other.id = case when c.owner_a_id = auth.uid() then c.owner_b_id else c.owner_a_id end
  left join lateral (
    select m.body, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where c.owner_a_id = auth.uid() or c.owner_b_id = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

create or replace function public.search_dogs(p_q text)
returns table (dog_id uuid, name text, breed text, age int, photo_url text, owner_id uuid, owner_name text)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name
  from public.dogs d
  join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid()
    and (coalesce(p_q, '') = '' or d.breed ilike '%' || p_q || '%' or d.name ilike '%' || p_q || '%')
  order by d.created_at desc
  limit 100;
$$;

create or replace function public.search_users(p_gender text default null, p_min_age int default 0, p_max_age int default 200)
returns table (user_id uuid, display_name text, photo_url text, gender text, age int)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.gender,
    extract(year from age(pr.date_of_birth))::int as age
  from public.profiles pr
  where pr.id <> auth.uid()
    and pr.date_of_birth is not null
    and (p_gender is null or pr.gender = p_gender)
    and extract(year from age(pr.date_of_birth))::int between coalesce(p_min_age, 0) and coalesce(p_max_age, 200)
  order by pr.display_name;
$$;
