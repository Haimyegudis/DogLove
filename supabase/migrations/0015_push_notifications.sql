-- Server-side push: on a new message / playdate request, send an Expo push
-- notification to the recipient's stored push_token via pg_net.
create extension if not exists pg_net;

-- New message → notify the other conversation member.
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
  v_token text;
  v_sender_name text;
begin
  select case when c.owner_a_id = new.sender_id then c.owner_b_id else c.owner_a_id end
    into v_recipient
  from public.conversations c where c.id = new.conversation_id;

  select push_token into v_token from public.profiles where id = v_recipient;
  select display_name into v_sender_name from public.profiles where id = new.sender_id;

  if v_token is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object('to', v_token, 'title', coalesce(v_sender_name, 'הודעה חדשה'), 'body', new.body, 'sound', 'default'),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message after insert on public.messages
  for each row execute function public.notify_new_message();

-- New playdate request → notify the target dog's owner.
create or replace function public.notify_new_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
  v_token text;
  v_from_name text;
begin
  select td.owner_id into v_recipient from public.dogs td where td.id = new.to_dog_id;
  select fd.name into v_from_name from public.dogs fd where fd.id = new.from_dog_id;
  select push_token into v_token from public.profiles where id = v_recipient;

  if v_token is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object('to', v_token, 'title', 'בקשת משחק חדשה 🐾', 'body', coalesce(v_from_name, 'כלב') || ' רוצה לשחק!', 'sound', 'default'),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_request on public.playdate_requests;
create trigger trg_notify_new_request after insert on public.playdate_requests
  for each row execute function public.notify_new_request();
