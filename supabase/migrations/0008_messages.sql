create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

-- membership helper: is the caller part of this conversation?
create or replace function public.is_conv_member(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conv and (c.owner_a_id = auth.uid() or c.owner_b_id = auth.uid())
  );
$$;

drop policy if exists "msg_select_member" on public.messages;
create policy "msg_select_member" on public.messages for select
  using (public.is_conv_member(conversation_id));

drop policy if exists "msg_insert_member" on public.messages;
create policy "msg_insert_member" on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conv_member(conversation_id));

-- Realtime for live messages
alter publication supabase_realtime add table public.messages;
alter table public.messages replica identity full;

-- Inbox: my conversations with the other participant + last message.
create or replace function public.list_conversations()
returns table (conversation_id uuid, other_id uuid, other_name text, other_photo text,
  last_body text, last_at timestamptz)
language sql stable as $$
  select c.id,
    other.id, other.display_name, other.photo_url,
    lm.body, lm.created_at
  from public.conversations c
  join public.profiles other
    on other.id = case when c.owner_a_id = auth.uid() then c.owner_b_id else c.owner_a_id end
  left join lateral (
    select m.body, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where c.owner_a_id = auth.uid() or c.owner_b_id = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc;
$$;
