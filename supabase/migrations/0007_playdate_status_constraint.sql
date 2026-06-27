-- Constrain status to the three valid values (the type layer assumes them).
alter table public.playdate_requests
  add constraint playdate_requests_status_check
  check (status in ('pending', 'accepted', 'declined'));

-- Harden the insert policy: a user may only create a NEW (pending) request
-- for a dog they own — they cannot self-insert an already-"accepted" row.
drop policy if exists "pr_insert_own_from" on public.playdate_requests;
create policy "pr_insert_own_from" on public.playdate_requests for insert with check (
  status = 'pending'
  and exists (select 1 from public.dogs d where d.id = from_dog_id and d.owner_id = auth.uid())
);
