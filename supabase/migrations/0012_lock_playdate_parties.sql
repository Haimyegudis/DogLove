-- Harden scheduled_playdates: the UPDATE RLS policy allows a participant to
-- rewrite organizer_id/guest_id (privilege escalation / participant
-- substitution). Make the two participant columns immutable on UPDATE via a
-- trigger, so updates can only touch starts_at / location_name / status.
create or replace function public.lock_playdate_parties()
returns trigger language plpgsql as $$
begin
  if new.organizer_id <> old.organizer_id or new.guest_id <> old.guest_id then
    raise exception 'cannot change playdate participants';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_playdate_parties on public.scheduled_playdates;
create trigger trg_lock_playdate_parties
  before update on public.scheduled_playdates
  for each row execute function public.lock_playdate_parties();
