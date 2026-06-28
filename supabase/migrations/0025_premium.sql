-- Premium tier: boolean flag + timestamp on profiles.
alter table public.profiles add column if not exists is_premium boolean not null default false;
alter table public.profiles add column if not exists premium_since timestamptz;

-- RPC: flip the premium flag for the calling user.
create or replace function public.set_premium(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    is_premium   = p_on,
    premium_since = case when p_on then now() else null end
  where id = auth.uid();
  return p_on;
end;
$$;

-- RPC: read-only check — is the calling user currently premium?
create or replace function public.am_i_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_premium from public.profiles where id = auth.uid()), false);
$$;

-- Permissions
revoke execute on function public.set_premium(boolean) from public, anon;
grant  execute on function public.set_premium(boolean) to authenticated;

revoke execute on function public.am_i_premium() from public, anon;
grant  execute on function public.am_i_premium() to authenticated;
