-- Audit fixes: block-aware messaging, bounded lost-dog push, coarsened lost coords.

-- 1) Blocked users cannot start a conversation.
create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_a uuid := least(auth.uid(), p_other); v_b uuid := greatest(auth.uid(), p_other);
begin
  if p_other = auth.uid() then raise exception 'cannot chat with self'; end if;
  if public.is_blocked_with(p_other) then raise exception 'blocked'; end if;
  insert into public.conversations (owner_a_id, owner_b_id) values (v_a, v_b)
    on conflict (owner_a_id, owner_b_id) do nothing;
  select id into v_id from public.conversations where owner_a_id = v_a and owner_b_id = v_b;
  return v_id;
end; $$;

-- 2) Blocked users cannot send messages even into an existing conversation.
drop policy if exists "msg_insert_member" on public.messages;
create policy "msg_insert_member" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conv_member(conversation_id)
    and not public.is_blocked_with((
      select case when c.owner_a_id = auth.uid() then c.owner_b_id else c.owner_a_id end
      from public.conversations c where c.id = conversation_id
    ))
  );

-- 3) Lost-dog alert pushes only people near the last-seen location (<=50km),
-- using their opted-in home_location; falls back to all when no coordinates.
create or replace function public.report_lost_dog(p_dog_id uuid, p_dog_name text, p_photo_url text, p_note text, p_lat float8, p_lng float8)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; r record; v_loc geography;
begin
  v_loc := case when p_lat is null then null else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end;
  insert into public.lost_dogs (owner_id, dog_id, dog_name, photo_url, note, location)
  values (auth.uid(), p_dog_id, p_dog_name, p_photo_url, p_note, v_loc)
  returning id into v_id;

  for r in
    select push_token from public.profiles
    where id <> auth.uid() and push_token is not null
      and (
        v_loc is null
        or home_location is null
        or st_dwithin(home_location, v_loc, 50000)
      )
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object('to', r.push_token, 'title', '🚨 כלב נעדר!',
        'body', coalesce(p_dog_name, 'כלב') || ' נעדר בקרבתך. אפשר לעזור?', 'sound', 'default'),
      headers := jsonb_build_object('Content-Type', 'application/json'));
  end loop;
  return v_id;
end; $$;

-- 4) Coarsen lost-dog coordinates returned to clients (~110m), matching the
-- nearby_active_dogs privacy posture.
create or replace function public.nearby_lost_dogs(p_lat float8, p_lng float8, p_radius_m float8 default 50000)
returns table (id uuid, dog_name text, photo_url text, note text, lat float8, lng float8,
  owner_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.dog_name, l.photo_url, l.note,
    round(st_y(l.location::geometry)::numeric, 3)::float8,
    round(st_x(l.location::geometry)::numeric, 3)::float8,
    p.display_name, l.created_at
  from public.lost_dogs l
  join public.profiles p on p.id = l.owner_id
  where l.is_found = false
    and (l.location is null or st_dwithin(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m))
  order by l.created_at desc limit 100;
$$;
