-- ===== Audit remediation: security + privacy =====

-- S2: lock RPC execution to authenticated users (anon had default EXECUTE).
revoke execute on all functions in schema public from anon;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public revoke execute on functions from anon;

-- S3: cap message length (anti-abuse + bounds the push payload).
alter table public.messages drop constraint if exists messages_body_len;
alter table public.messages add constraint messages_body_len check (char_length(body) between 1 and 2000);

-- P1+P2: the live map now (a) respects the other user's is_discoverable, and
-- (b) coarsens coordinates to ~110m (round to 3 decimals) so a precise live
-- track can't be followed.
create or replace function public.nearby_active_dogs(p_lat float8, p_lng float8, p_radius_m float8)
returns table (dog_id uuid, name text, breed text, photo_url text, lat float8, lng float8, distance_m float8)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.photo_url,
    round(st_y(ws.location::geometry)::numeric, 3)::float8 as lat,
    round(st_x(ws.location::geometry)::numeric, 3)::float8 as lng,
    st_distance(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.walk_sessions ws
  join public.dogs d on d.id = ws.dog_id
  join public.profiles p on p.id = d.owner_id
  where ws.is_active = true
    and ws.location is not null
    and coalesce(p.is_discoverable, true)
    and st_dwithin(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc;
$$;

-- P2: only ACTIVE sessions of DISCOVERABLE owners are row-readable (was world
-- readable). Realtime still delivers these to nearby viewers.
drop policy if exists "ws_select_all" on public.walk_sessions;
drop policy if exists "ws_select_active_discoverable" on public.walk_sessions;
create policy "ws_select_active_discoverable" on public.walk_sessions for select using (
  is_active = true
  and exists (
    select 1 from public.dogs d join public.profiles p on p.id = d.owner_id
    where d.id = walk_sessions.dog_id and coalesce(p.is_discoverable, true)
  )
);

-- F12: push the requester when their playdate request is accepted.
create or replace function public.respond_to_request(p_request_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_from_owner uuid;
  v_to_owner uuid;
  v_token text;
  v_to_name text;
begin
  select fd.owner_id, td.owner_id into v_from_owner, v_to_owner
  from public.playdate_requests r
  join public.dogs fd on fd.id = r.from_dog_id
  join public.dogs td on td.id = r.to_dog_id
  where r.id = p_request_id;

  if v_to_owner is null then raise exception 'request not found'; end if;
  if v_caller <> v_to_owner then raise exception 'not authorized'; end if;

  update public.playdate_requests
    set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_request_id;

  if p_accept then
    insert into public.conversations (owner_a_id, owner_b_id)
    values (least(v_from_owner, v_to_owner), greatest(v_from_owner, v_to_owner))
    on conflict (owner_a_id, owner_b_id) do nothing;

    select push_token into v_token from public.profiles where id = v_from_owner;
    select display_name into v_to_name from public.profiles where id = v_to_owner;
    if v_token is not null then
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := jsonb_build_object('to', v_token, 'title', 'בקשת המשחק אושרה! 🎉',
          'body', coalesce(v_to_name, 'מישהו') || ' אישר/ה את בקשת המשחק', 'sound', 'default'),
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    end if;
  end if;
end;
$$;
