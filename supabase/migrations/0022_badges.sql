-- ===================================================================
-- Badges / achievements derived from walk_log.
-- No progress table — computed on the fly from existing walk_log data.
-- ===================================================================

create or replace function public.my_badges()
returns table (
  code     text,
  label    text,
  emoji    text,
  earned   boolean,
  progress numeric,
  target   numeric
)
language sql stable security definer set search_path = public as $$
  with stats as (
    select
      count(*)                                                          as total_walks,
      coalesce(sum(distance_m), 0) / 1000.0                            as total_km,
      count(distinct (ended_at at time zone 'UTC')::date)              as streak,
      count(*) filter (where ended_at > now() - interval '7 days')     as week_walks
    from public.walk_log
    where owner_id = auth.uid()
  ),
  defs (code, label, emoji, target) as (
    values
      ('first_walk',    'טיול ראשון',        '🐾', 1::numeric),
      ('walks_10',      '10 טיולים',         '🥉', 10::numeric),
      ('walks_50',      '50 טיולים',         '🥈', 50::numeric),
      ('walks_100',     '100 טיולים',        '🥇', 100::numeric),
      ('km_10',         '10 ק"מ',            '🏃', 10::numeric),
      ('km_50',         '50 ק"מ',            '🚀', 50::numeric),
      ('week_warrior',  '5 טיולים בשבוע',   '🔥', 5::numeric)
  )
  select
    b.code,
    b.label,
    b.emoji,
    case b.code
      when 'first_walk'   then s.total_walks  >= 1
      when 'walks_10'     then s.total_walks  >= 10
      when 'walks_50'     then s.total_walks  >= 50
      when 'walks_100'    then s.total_walks  >= 100
      when 'km_10'        then s.total_km     >= 10
      when 'km_50'        then s.total_km     >= 50
      when 'week_warrior' then s.week_walks   >= 5
    end::boolean                                   as earned,
    case b.code
      when 'km_10'        then round(s.total_km::numeric, 1)
      when 'km_50'        then round(s.total_km::numeric, 1)
      else
        case b.code
          when 'week_warrior' then s.week_walks::numeric
          else s.total_walks::numeric
        end
    end                                            as progress,
    b.target
  from defs b cross join stats s
  order by b.target asc;
$$;

-- Security: revoke from public, grant to authenticated only.
revoke execute on function public.my_badges() from public;
grant  execute on function public.my_badges() to authenticated;
