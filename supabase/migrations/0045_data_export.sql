-- 0045_data_export.sql
-- Self-service data export for the Privacy Center (GDPR-style "right to access").
-- Returns a single jsonb document containing ONLY the calling user's own rows.
-- SECURITY DEFINER so it can read across tables, but every branch is scoped to
-- auth.uid(), so a caller can never reach another user's data.

create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'user_id', auth.uid(),

    -- Account / profile (approximate home area exposed as lat/lng only if the
    -- user opted in and it was ever stamped).
    'profile', (
      select to_jsonb(p) - 'home_location' - 'walker_location'
        || jsonb_build_object(
             'home_location', case
               when p.home_location is null then null
               else jsonb_build_object(
                 'lat', st_y(p.home_location::geometry),
                 'lng', st_x(p.home_location::geometry))
             end)
      from public.profiles p
      where p.id = auth.uid()
    ),

    -- Dog profiles owned by the caller.
    'dogs', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.created_at)
      from public.dogs d
      where d.owner_id = auth.uid()
    ), '[]'::jsonb),

    -- Photo posts.
    'dog_posts', coalesce((
      select jsonb_agg(to_jsonb(dp) order by dp.created_at)
      from public.dog_posts dp
      where dp.owner_id = auth.uid()
    ), '[]'::jsonb),

    -- Chat messages the caller SENT (not messages received from others).
    'messages_sent', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at)
      from public.messages m
      where m.sender_id = auth.uid()
    ), '[]'::jsonb),

    -- Playdates the caller is part of, as organizer or guest.
    'scheduled_playdates', coalesce((
      select jsonb_agg(to_jsonb(sp) order by sp.starts_at)
      from public.scheduled_playdates sp
      where sp.organizer_id = auth.uid() or sp.guest_id = auth.uid()
    ), '[]'::jsonb),

    -- Park check-ins (location exposed as lat/lng).
    'park_checkins', coalesce((
      select jsonb_agg(
        (to_jsonb(pc) - 'location')
        || jsonb_build_object(
             'lat', st_y(pc.location::geometry),
             'lng', st_x(pc.location::geometry))
        order by pc.created_at)
      from public.park_checkins pc
      where pc.user_id = auth.uid()
    ), '[]'::jsonb),

    -- Lost-dog reports the caller filed (location may be null).
    'lost_dogs', coalesce((
      select jsonb_agg(
        (to_jsonb(ld) - 'location')
        || jsonb_build_object(
             'lat', case when ld.location is null then null else st_y(ld.location::geometry) end,
             'lng', case when ld.location is null then null else st_x(ld.location::geometry) end)
        order by ld.created_at)
      from public.lost_dogs ld
      where ld.owner_id = auth.uid()
    ), '[]'::jsonb),

    -- Walk history.
    'walk_log', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.created_at)
      from public.walk_log w
      where w.owner_id = auth.uid()
    ), '[]'::jsonb),

    -- Ratings the caller GAVE to other users.
    'user_ratings_given', coalesce((
      select jsonb_agg(to_jsonb(ur) order by ur.created_at)
      from public.user_ratings ur
      where ur.rater_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
