-- playdate_requests: one dog asking another for a playdate
create table if not exists public.playdate_requests (
  id uuid primary key default gen_random_uuid(),
  from_dog_id uuid not null references public.dogs (id) on delete cascade,
  to_dog_id uuid not null references public.dogs (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists pr_to_dog_idx on public.playdate_requests (to_dog_id);
create index if not exists pr_from_dog_idx on public.playdate_requests (from_dog_id);

alter table public.playdate_requests enable row level security;

drop policy if exists "pr_select_involved" on public.playdate_requests;
create policy "pr_select_involved" on public.playdate_requests for select using (
  exists (select 1 from public.dogs d where d.id = from_dog_id and d.owner_id = auth.uid())
  or exists (select 1 from public.dogs d where d.id = to_dog_id and d.owner_id = auth.uid())
);

drop policy if exists "pr_insert_own_from" on public.playdate_requests;
create policy "pr_insert_own_from" on public.playdate_requests for insert with check (
  exists (select 1 from public.dogs d where d.id = from_dog_id and d.owner_id = auth.uid())
);

-- conversations: normalized owner pair (owner_a < owner_b), unique
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_a_id uuid not null references public.profiles (id) on delete cascade,
  owner_b_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_a_id, owner_b_id)
);

alter table public.conversations enable row level security;

drop policy if exists "conv_select_member" on public.conversations;
create policy "conv_select_member" on public.conversations for select using (
  auth.uid() = owner_a_id or auth.uid() = owner_b_id
);

-- Browse other people's dogs (newest first), excluding the caller's own dogs.
create or replace function public.browse_dogs(p_limit int default 50)
returns table (dog_id uuid, name text, breed text, age int, photo_url text, owner_id uuid, owner_name text)
language sql stable as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name
  from public.dogs d
  join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid()
  order by d.created_at desc
  limit p_limit;
$$;

-- Requests TO my dogs (incoming), with the requesting dog + owner.
create or replace function public.incoming_requests()
returns table (request_id uuid, status text, created_at timestamptz,
  dog_id uuid, dog_name text, dog_breed text, dog_photo text, owner_name text)
language sql stable as $$
  select r.id, r.status, r.created_at, fd.id, fd.name, fd.breed, fd.photo_url, p.display_name
  from public.playdate_requests r
  join public.dogs td on td.id = r.to_dog_id
  join public.dogs fd on fd.id = r.from_dog_id
  join public.profiles p on p.id = fd.owner_id
  where td.owner_id = auth.uid()
  order by r.created_at desc;
$$;

-- Requests FROM my dogs (outgoing), with the target dog + owner.
create or replace function public.outgoing_requests()
returns table (request_id uuid, status text, created_at timestamptz,
  dog_id uuid, dog_name text, dog_breed text, dog_photo text, owner_name text)
language sql stable as $$
  select r.id, r.status, r.created_at, td.id, td.name, td.breed, td.photo_url, p.display_name
  from public.playdate_requests r
  join public.dogs fd on fd.id = r.from_dog_id
  join public.dogs td on td.id = r.to_dog_id
  join public.profiles p on p.id = td.owner_id
  where fd.owner_id = auth.uid()
  order by r.created_at desc;
$$;

-- Accept/decline. On accept, create the (deduped) conversation. The caller
-- must own the to_dog. security definer so the conversation insert is atomic.
create or replace function public.respond_to_request(p_request_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_from_owner uuid;
  v_to_owner uuid;
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
  end if;
end;
$$;
