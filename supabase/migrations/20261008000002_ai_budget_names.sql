-- `column reference "visitor" is ambiguous`, on the first live call.
--
-- `public.ai_budget_take` took parameters called `visitor` and `chat`, and
-- `private.ai_usage` has columns of the same names. Everywhere that mattered
-- was qualified except one place that cannot be: the `on conflict (day,
-- visitor, chat)` target, where Postgres resolves a bare name against both the
-- table's columns and the function's variables and refuses to guess.
--
-- Renaming the parameters is the fix. A parameter name is part of the
-- signature, so `create or replace` cannot do it - the old function is dropped
-- first. The route sends named arguments, so lib/ai/budget.ts changes with it.

drop function if exists public.ai_budget_take(text, text, text, integer, integer, integer, integer);

create or replace function public.ai_budget_take(
  candidate text,
  visitor_hash text,
  chat_id text,
  max_chats_per_day integer,
  max_messages_per_chat integer,
  max_messages_per_day integer,
  max_messages_global integer
)
returns table (allowed boolean, reason text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  chats_today integer;
  in_this_chat integer;
  by_visitor_today integer;
  everyone_today integer;
begin
  perform private.assert_secret('ai', candidate);

  -- Yesterday's counters answer no question anybody asks.
  delete from private.ai_usage where day < today - 30;

  select count(distinct u.chat), coalesce(sum(u.messages), 0)
    into chats_today, by_visitor_today
    from private.ai_usage u
   where u.day = today and u.visitor = visitor_hash;

  select coalesce(u.messages, 0) into in_this_chat
    from private.ai_usage u
   where u.day = today and u.visitor = visitor_hash and u.chat = chat_id;

  select coalesce(sum(u.messages), 0) into everyone_today
    from private.ai_usage u where u.day = today;

  in_this_chat := coalesce(in_this_chat, 0);

  if everyone_today >= max_messages_global then
    return query select false, 'global'; return;
  end if;
  if by_visitor_today >= max_messages_per_day then
    return query select false, 'visitorDay'; return;
  end if;
  if in_this_chat >= max_messages_per_chat then
    return query select false, 'chat'; return;
  end if;
  if in_this_chat = 0 and chats_today >= max_chats_per_day then
    return query select false, 'chatsPerDay'; return;
  end if;

  insert into private.ai_usage (day, visitor, chat, messages)
  values (today, visitor_hash, chat_id, 1)
  on conflict (day, visitor, chat) do update set messages = private.ai_usage.messages + 1;

  return query select true, 'ok';
end;
$$;

revoke all on function public.ai_budget_take(text, text, text, integer, integer, integer, integer)
  from public;
grant execute on function public.ai_budget_take(text, text, text, integer, integer, integer, integer)
  to anon, authenticated;

comment on function public.ai_budget_take is
  'Takes one assistant message from the daily budget. Requires the ai job secret.';
