-- Dog compatibility score RPC.
-- Computes a 0-100 match score between two dogs using columns that actually
-- exist on public.dogs: size (S/M/L), breed, age (int), gender.
-- Score starts at 50 and adjustments are clamped to [0, 100].

create or replace function public.dog_compatibility(
  p_dog_a uuid,
  p_dog_b uuid
)
returns table(score int, reasons text[])
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_size_a   text;
  v_breed_a  text;
  v_age_a    int;
  v_gender_a text;

  v_size_b   text;
  v_breed_b  text;
  v_age_b    int;
  v_gender_b text;

  v_score    int := 50;
  v_reasons  text[] := '{}';

  -- Size order map: S=1, M=2, L=3
  v_size_ord_a int;
  v_size_ord_b int;
begin
  -- Load dog A
  select d.size, d.breed, d.age, d.gender
    into v_size_a, v_breed_a, v_age_a, v_gender_a
    from public.dogs d
   where d.id = p_dog_a;

  if not found then
    raise exception 'dog_a not found: %', p_dog_a;
  end if;

  -- Load dog B
  select d.size, d.breed, d.age, d.gender
    into v_size_b, v_breed_b, v_age_b, v_gender_b
    from public.dogs d
   where d.id = p_dog_b;

  if not found then
    raise exception 'dog_b not found: %', p_dog_b;
  end if;

  -- ── Size compatibility (+20 same, +10 adjacent, 0 far) ─────────────────
  if v_size_a is not null and v_size_b is not null then
    v_size_ord_a := case upper(v_size_a)
      when 'S' then 1
      when 'M' then 2
      when 'L' then 3
      else null
    end;
    v_size_ord_b := case upper(v_size_b)
      when 'S' then 1
      when 'M' then 2
      when 'L' then 3
      else null
    end;

    if v_size_ord_a is not null and v_size_ord_b is not null then
      if v_size_ord_a = v_size_ord_b then
        v_score   := v_score + 20;
        v_reasons := array_append(v_reasons, 'גודל דומה');
      elsif abs(v_size_ord_a - v_size_ord_b) = 1 then
        v_score   := v_score + 10;
        v_reasons := array_append(v_reasons, 'גודל קרוב');
      else
        -- Large gap (S vs L): small penalty
        v_score := v_score - 5;
      end if;
    end if;
  end if;

  -- ── Breed match (+15 exact, +5 partial/prefix) ─────────────────────────
  if v_breed_a is not null and v_breed_b is not null then
    if lower(v_breed_a) = lower(v_breed_b) then
      v_score   := v_score + 15;
      v_reasons := array_append(v_reasons, 'גזע זהה');
    elsif lower(v_breed_a) ilike '%' || split_part(lower(v_breed_b), ' ', 1) || '%'
       or lower(v_breed_b) ilike '%' || split_part(lower(v_breed_a), ' ', 1) || '%' then
      v_score   := v_score + 5;
      v_reasons := array_append(v_reasons, 'גזע דומה');
    end if;
  end if;

  -- ── Age proximity (+15 within 2 yrs, +8 within 5 yrs) ─────────────────
  if v_age_a is not null and v_age_b is not null then
    if abs(v_age_a - v_age_b) <= 2 then
      v_score   := v_score + 15;
      v_reasons := array_append(v_reasons, 'גיל קרוב');
    elsif abs(v_age_a - v_age_b) <= 5 then
      v_score   := v_score + 8;
      v_reasons := array_append(v_reasons, 'טווח גיל סביר');
    else
      v_score := v_score - 5;
    end if;
  end if;

  -- ── Gender pairing (+5 opposite genders — typically friendlier) ─────────
  if v_gender_a is not null and v_gender_b is not null then
    if lower(v_gender_a) <> lower(v_gender_b) then
      v_score   := v_score + 5;
      v_reasons := array_append(v_reasons, 'מין משלים');
    end if;
  end if;

  -- ── Clamp to [0, 100] ───────────────────────────────────────────────────
  v_score := greatest(0, least(100, v_score));

  return query select v_score, v_reasons;
end;
$$;

-- Permissions
revoke all on function public.dog_compatibility(uuid, uuid) from public;
grant execute on function public.dog_compatibility(uuid, uuid) to authenticated;
