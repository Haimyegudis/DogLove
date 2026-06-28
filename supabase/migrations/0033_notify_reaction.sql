-- Push the post owner when someone reacts to their dog photo.
create or replace function public.notify_new_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_token text;
  v_name text;
begin
  select owner_id into v_owner from public.dog_posts where id = new.post_id;
  if v_owner is null or v_owner = new.user_id then
    return new; -- own post, no self-notification
  end if;

  select push_token into v_token from public.profiles where id = v_owner;
  select display_name into v_name from public.profiles where id = new.user_id;

  if v_token is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object(
        'to', v_token,
        'title', 'תגובה חדשה ' || coalesce(new.emoji, '💖'),
        'body', coalesce(v_name, 'מישהו') || ' הגיב/ה לתמונה של הכלב שלך',
        'sound', 'default'),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_new_reaction on public.post_reactions;
create trigger trg_notify_new_reaction
  after insert on public.post_reactions
  for each row execute function public.notify_new_reaction();
