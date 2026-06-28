-- Add p_intent text[] filter to search_users so the app can filter
-- owners by what they are looking for (friends / dates / walks).

drop function if exists public.search_users(text, text, integer, integer, text);

create or replace function public.search_users(
  p_q        text    default null,
  p_gender   text    default null,
  p_min_age  int     default 0,
  p_max_age  int     default 200,
  p_city     text    default null,
  p_intent   text[]  default null
)
returns table (user_id uuid, display_name text, photo_url text, gender text, age integer, city text)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.gender,
    extract(year from age(pr.date_of_birth))::int as age, pr.city
  from public.profiles pr
  where pr.id <> auth.uid()
    and coalesce(pr.is_discoverable, true)
    and not public.is_blocked_with(pr.id)
    and pr.date_of_birth is not null
    and (coalesce(p_q, '') = '' or pr.display_name ilike '%' || p_q || '%')
    and (p_gender is null or pr.gender = p_gender)
    and extract(year from age(pr.date_of_birth))::int
          between coalesce(p_min_age, 0) and coalesce(p_max_age, 200)
    and (coalesce(p_city, '') = '' or pr.city ilike '%' || p_city || '%')
    and (p_intent is null or array_length(p_intent, 1) is null or pr.intent && p_intent)
  order by pr.display_name;
$$;

revoke execute on function public.search_users(text, text, integer, integer, text, text[]) from public;
grant  execute on function public.search_users(text, text, integer, integer, text, text[]) to authenticated;
