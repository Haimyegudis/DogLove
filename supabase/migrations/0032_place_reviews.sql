-- User reviews/rankings for OSM-sourced places (vets, dog-parks, pet-shops).
-- Place identity = OSM element id + kind. We also store the place name/coords on
-- the review so the place can be shown without re-querying Overpass.

create table if not exists public.place_reviews (
  place_id bigint not null,
  kind text not null check (kind in ('vet', 'park', 'petshop')),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  tags text[],
  place_name text,
  lat float8,
  lng float8,
  created_at timestamptz not null default now(),
  primary key (place_id, kind, user_id)
);
create index if not exists place_reviews_lookup_idx on public.place_reviews (kind, place_id);

alter table public.place_reviews enable row level security;
drop policy if exists "place_reviews_select_all" on public.place_reviews;
create policy "place_reviews_select_all" on public.place_reviews for select using (true);
drop policy if exists "place_reviews_insert_own" on public.place_reviews;
create policy "place_reviews_insert_own" on public.place_reviews for insert with check (auth.uid() = user_id);
drop policy if exists "place_reviews_update_own" on public.place_reviews;
create policy "place_reviews_update_own" on public.place_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "place_reviews_delete_own" on public.place_reviews;
create policy "place_reviews_delete_own" on public.place_reviews for delete using (auth.uid() = user_id);

-- Upsert the caller's review for a place.
create or replace function public.rate_place(
  p_place_id bigint, p_kind text, p_stars int, p_comment text default null,
  p_tags text[] default null, p_name text default null,
  p_lat float8 default null, p_lng float8 default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.place_reviews (place_id, kind, user_id, stars, comment, tags, place_name, lat, lng)
  values (p_place_id, p_kind, auth.uid(), p_stars, nullif(p_comment, ''), p_tags, p_name, p_lat, p_lng)
  on conflict (place_id, kind, user_id) do update
    set stars = excluded.stars, comment = excluded.comment, tags = excluded.tags,
        place_name = excluded.place_name, created_at = now();
end; $$;

-- Aggregated rating per place for a set of ids (to merge into a list).
create or replace function public.place_ratings(p_ids bigint[], p_kind text)
returns table (place_id bigint, avg_stars numeric, rating_count bigint)
language sql stable security definer set search_path = public as $$
  select r.place_id, round(avg(r.stars), 1), count(*)
  from public.place_reviews r
  where r.kind = p_kind and r.place_id = any(p_ids)
  group by r.place_id;
$$;

-- All reviews for one place (for the detail view).
create or replace function public.list_place_reviews(p_place_id bigint, p_kind text)
returns table (stars int, comment text, tags text[], reviewer_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.stars, r.comment, r.tags, p.display_name, r.created_at
  from public.place_reviews r join public.profiles p on p.id = r.user_id
  where r.place_id = p_place_id and r.kind = p_kind
  order by r.created_at desc limit 100;
$$;

-- The caller's own review for a place (to pre-fill the form).
create or replace function public.my_place_review(p_place_id bigint, p_kind text)
returns table (stars int, comment text, tags text[])
language sql stable security definer set search_path = public as $$
  select r.stars, r.comment, r.tags
  from public.place_reviews r
  where r.place_id = p_place_id and r.kind = p_kind and r.user_id = auth.uid();
$$;

revoke execute on function public.rate_place(bigint, text, int, text, text[], text, float8, float8) from public;
grant execute on function public.rate_place(bigint, text, int, text, text[], text, float8, float8) to authenticated;
revoke execute on function public.place_ratings(bigint[], text) from public;
grant execute on function public.place_ratings(bigint[], text) to authenticated;
revoke execute on function public.list_place_reviews(bigint, text) from public;
grant execute on function public.list_place_reviews(bigint, text) to authenticated;
revoke execute on function public.my_place_review(bigint, text) from public;
grant execute on function public.my_place_review(bigint, text) to authenticated;
