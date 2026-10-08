-- The assistant costs money per question, and the OpenAI project has a $5
-- roof. The roof is the backstop; this is the plan.
--
-- Why the counters live in the database rather than in the function:
-- lib/security/rate-limit.ts is a map in memory, and serverless gives every
-- instance its own. Five instances, five times the limit. A budget guard that
-- scales with traffic is not a budget guard.
--
-- Same shape as the retention job, and for the same reason: the route holds a
-- shared secret rather than a service-role key, so a leak buys an attacker the
-- ability to exhaust a daily counter - not the ability to read a CV.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.ai_usage (
  day date not null,
  -- A daily-rotating hash of IP and user agent, salted with the job secret.
  -- Not an identifier: it cannot be reversed, it changes every midnight, and
  -- nothing else is stored beside it.
  visitor text not null,
  chat text not null,
  messages integer not null default 0,
  primary key (day, visitor, chat)
);

alter table private.ai_usage enable row level security;
revoke all on table private.ai_usage from public, anon, authenticated;

create or replace function private.assert_secret(job text, candidate text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored text;
begin
  select secret_hash into stored from private.job_secret where name = job;
  if stored is null then
    raise exception 'no secret configured for %', job using errcode = '42501';
  end if;
  if candidate is null
     or encode(extensions.digest(candidate, 'sha256'), 'hex') is distinct from stored then
    raise exception 'bad secret' using errcode = '42501';
  end if;
end;
$$;

/**
 * Takes one message from the budget, or says why it cannot.
 *
 * Every limit is passed in by the caller rather than written here, so the
 * numbers live in one place - lib/ai/budget.ts - and this function enforces
 * whatever it is told. Only the holder of the secret can call it at all.
 *
 * Checks before it increments, and does both in one statement, so two requests
 * arriving together cannot both be the last one through.
 */
create or replace function public.ai_budget_take(
  candidate text,
  visitor text,
  chat text,
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
   where u.day = today and u.visitor = ai_budget_take.visitor;

  select coalesce(u.messages, 0) into in_this_chat
    from private.ai_usage u
   where u.day = today and u.visitor = ai_budget_take.visitor and u.chat = ai_budget_take.chat;

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
  values (today, ai_budget_take.visitor, ai_budget_take.chat, 1)
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
