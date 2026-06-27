-- Add a free-text city to profiles and let search filter by it.
alter table public.profiles add column if not exists city text;

-- search_dogs now also filters/returns the owner's city.
drop function if exists public.search_dogs(text);
create or replace function public.search_dogs(p_q text, p_city text default null)
returns table (dog_id uuid, name text, breed text, age int, photo_url text, owner_id uuid, owner_name text, city text)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name, p.city
  from public.dogs d
  join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid() and coalesce(p.is_discoverable, true)
    and (coalesce(p_q, '') = '' or d.breed ilike '%' || p_q || '%' or d.name ilike '%' || p_q || '%')
    and (coalesce(p_city, '') = '' or p.city ilike '%' || p_city || '%')
  order by d.created_at desc
  limit 100;
$$;

-- search_users now also filters/returns city.
drop function if exists public.search_users(text, int, int);
create or replace function public.search_users(p_gender text default null, p_min_age int default 0, p_max_age int default 200, p_city text default null)
returns table (user_id uuid, display_name text, photo_url text, gender text, age int, city text)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.gender,
    extract(year from age(pr.date_of_birth))::int as age, pr.city
  from public.profiles pr
  where pr.id <> auth.uid() and coalesce(pr.is_discoverable, true)
    and pr.date_of_birth is not null
    and (p_gender is null or pr.gender = p_gender)
    and extract(year from age(pr.date_of_birth))::int between coalesce(p_min_age, 0) and coalesce(p_max_age, 200)
    and (coalesce(p_city, '') = '' or pr.city ilike '%' || p_city || '%')
  order by pr.display_name;
$$;
