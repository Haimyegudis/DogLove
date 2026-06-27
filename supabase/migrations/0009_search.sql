-- Dogs whose breed/name matches the query (case-insensitive), excluding own.
create or replace function public.search_dogs(p_q text)
returns table (dog_id uuid, name text, breed text, age int, photo_url text, owner_id uuid, owner_name text)
language sql stable as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name
  from public.dogs d
  join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid()
    and (coalesce(p_q, '') = '' or d.breed ilike '%' || p_q || '%' or d.name ilike '%' || p_q || '%')
  order by d.created_at desc
  limit 100;
$$;

-- Users filtered by gender + computed age range, excluding the caller.
create or replace function public.search_users(p_gender text default null, p_min_age int default 0, p_max_age int default 200)
returns table (user_id uuid, display_name text, photo_url text, gender text, age int)
language sql stable as $$
  select pr.id, pr.display_name, pr.photo_url, pr.gender,
    extract(year from age(pr.date_of_birth))::int as age
  from public.profiles pr
  where pr.id <> auth.uid()
    and pr.date_of_birth is not null
    and (p_gender is null or pr.gender = p_gender)
    and extract(year from age(pr.date_of_birth))::int between coalesce(p_min_age, 0) and coalesce(p_max_age, 200)
  order by pr.display_name;
$$;
