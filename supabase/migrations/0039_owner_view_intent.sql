-- Owner discovery (the dating spine) + intent tags.

-- What the user is here for (any of: friends / dates / walks).
alter table public.profiles add column if not exists intent text[];

-- Public owner card.
create or replace function public.get_owner_card(p_owner uuid)
returns table (user_id uuid, display_name text, photo_url text, city text,
  gender text, age int, intent text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.photo_url, p.city, p.gender,
    case when p.date_of_birth is null then null else extract(year from age(p.date_of_birth))::int end,
    p.intent
  from public.profiles p
  where p.id = p_owner
    and (p.id = auth.uid()
         or (coalesce(p.is_discoverable, true) and not public.is_blocked_with(p.id)));
$$;

-- An owner's dogs (public, discoverability/block aware).
create or replace function public.list_owner_dogs(p_owner uuid)
returns table (dog_id uuid, name text, breed text, age int, photo_url text)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.photo_url
  from public.dogs d join public.profiles p on p.id = d.owner_id
  where d.owner_id = p_owner
    and (d.owner_id = auth.uid()
         or (coalesce(p.is_discoverable, true) and not public.is_blocked_with(d.owner_id)))
  order by d.created_at asc;
$$;

-- Set my intent tags.
create or replace function public.set_intent(p_intent text[])
returns void language sql security definer set search_path = public as $$
  update public.profiles set intent = p_intent where id = auth.uid();
$$;

revoke execute on function public.get_owner_card(uuid) from public;
grant execute on function public.get_owner_card(uuid) to authenticated;
revoke execute on function public.list_owner_dogs(uuid) from public;
grant execute on function public.list_owner_dogs(uuid) to authenticated;
revoke execute on function public.set_intent(text[]) from public;
grant execute on function public.set_intent(text[]) to authenticated;
