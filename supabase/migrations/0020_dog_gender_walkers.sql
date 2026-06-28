-- Dog gender (required at the form layer).
alter table public.dogs add column if not exists gender text;

-- Social dog-walkers: users who offer to walk other people's dogs.
alter table public.profiles add column if not exists is_walker boolean not null default false;

-- Available walkers (not me, discoverable, not blocked), with their rating.
create or replace function public.available_walkers(p_city text default null)
returns table (user_id uuid, display_name text, photo_url text, city text, avg_stars numeric, rating_count bigint)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.city,
    (select round(coalesce(avg(stars), 0), 1) from public.user_ratings r where r.rated_id = pr.id),
    (select count(*) from public.user_ratings r where r.rated_id = pr.id)
  from public.profiles pr
  where pr.id <> auth.uid() and pr.is_walker = true
    and coalesce(pr.is_discoverable, true)
    and not public.is_blocked_with(pr.id)
    and (coalesce(p_city, '') = '' or pr.city ilike '%' || p_city || '%')
  order by pr.display_name;
$$;

-- Start (or reuse) a conversation with another user — used to message a walker.
create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_a uuid := least(auth.uid(), p_other); v_b uuid := greatest(auth.uid(), p_other);
begin
  if p_other = auth.uid() then raise exception 'cannot chat with self'; end if;
  insert into public.conversations (owner_a_id, owner_b_id) values (v_a, v_b)
    on conflict (owner_a_id, owner_b_id) do nothing;
  select id into v_id from public.conversations where owner_a_id = v_a and owner_b_id = v_b;
  return v_id;
end; $$;
