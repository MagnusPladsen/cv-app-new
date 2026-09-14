-- GDPR Art. 5(1)(e): personal data may be kept no longer than necessary. An
-- abandoned CVApp account has no purpose left, so it is warned and then
-- deleted. Policy: 24 months with no sign-in, an email, 30 days, then gone.
--
-- Why all of it lives in the database rather than in the cron job:
--
-- The job runs on Vercel, and the only way for a Vercel function to read or
-- delete a user is a service-role key - which would also let it read every CV
-- in the database. The privacy policy says CV content never reaches a CVApp
-- server, and lib/privacy/__tests__/no-server-cv.test.ts exists to keep that
-- true. Holding a key capable of breaking it is a worse position than not
-- holding one, even if nothing uses it.
--
-- So the job holds no key at all. It holds a shared secret, these functions
-- check it themselves, and they return the two email addresses they need to
-- and nothing else. A leaked secret lets someone trigger the deletion of
-- accounts that were already due to be deleted. It gives them no way to read
-- anything.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Not exposed through PostgREST: the `private` schema is not in the API's
-- search path, and nothing here is granted to a client role.
create table if not exists private.job_secret (
  name text primary key,
  secret_hash text not null
);

/**
 * Raises unless the caller knows the secret. Every function below starts here.
 *
 * The secret is stored hashed, so a database dump does not hand someone the
 * ability to trigger deletions. Set it once, from the SQL editor:
 *
 *   insert into private.job_secret (name, secret_hash)
 *   values ('retention', encode(extensions.digest('<the secret>', 'sha256'), 'hex'))
 *   on conflict (name) do update set secret_hash = excluded.secret_hash;
 *
 * Until that row exists every function refuses, which is the safe default: a
 * misconfigured retention job must delete nothing.
 */
create or replace function private.assert_job_secret(candidate text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored text;
begin
  select secret_hash into stored from private.job_secret where name = 'retention';

  if stored is null then
    raise exception 'retention job secret is not configured';
  end if;

  if candidate is null
     or encode(extensions.digest(candidate, 'sha256'), 'hex') <> stored then
    raise exception 'forbidden';
  end if;
end;
$$;

-- Who has been warned, and when. A row is the only state the schedule needs.
create table if not exists public.retention_notices (
  user_id uuid primary key references auth.users (id) on delete cascade,
  warned_at timestamptz not null default now()
);

-- RLS on with no policies at all: nothing reads this through the API. The
-- definer functions below bypass it, which is the only access it has.
alter table public.retention_notices enable row level security;
revoke all on table public.retention_notices from public, anon, authenticated;

/**
 * Accounts inactive long enough to warn, that have not been warned yet.
 *
 * Returns an email address and nothing else - no CV, no id beyond what
 * marking requires. `last_sign_in_at` is null for someone who confirmed an
 * account and never came back, so fall back to when it was created.
 */
create or replace function public.retention_due(job_secret text)
returns table (user_id uuid, email text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_job_secret(job_secret);

  return query
    select users.id, users.email::text
    from auth.users as users
    left join public.retention_notices as notices on notices.user_id = users.id
    where notices.user_id is null
      and users.deleted_at is null
      and users.email is not null
      and coalesce(users.last_sign_in_at, users.created_at) < now() - interval '24 months'
    -- A batch, not the world. One free-tier cron run should not try to send
    -- ten thousand emails; the rest are picked up tomorrow.
    limit 200;
end;
$$;

/**
 * Records that a warning was sent. Called only after the email provider
 * accepted it, so a failed send is retried tomorrow rather than starting a
 * 30-day countdown nobody was told about.
 */
create or replace function public.retention_mark_warned(job_secret text, ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked integer;
begin
  perform private.assert_job_secret(job_secret);

  insert into public.retention_notices (user_id)
  select unnest(ids)
  on conflict (user_id) do nothing;

  get diagnostics marked = row_count;
  return marked;
end;
$$;

/**
 * Deletes accounts warned at least 30 days ago that are still inactive, and
 * forgets the warning for anyone who came back.
 *
 * Signing in is what cancels the deletion, and it has to cancel it silently -
 * a person who returns after two years should not be deleted a week later
 * because a row outlived their visit.
 */
create or replace function public.retention_delete_expired(job_secret text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  perform private.assert_job_secret(job_secret);

  delete from public.retention_notices as notices
  using auth.users as users
  where notices.user_id = users.id
    and coalesce(users.last_sign_in_at, users.created_at) >= now() - interval '24 months';

  delete from auth.users as users
  where users.id in (
    select notices.user_id
    from public.retention_notices as notices
    join auth.users as inactive on inactive.id = notices.user_id
    where notices.warned_at < now() - interval '30 days'
      and coalesce(inactive.last_sign_in_at, inactive.created_at)
            < now() - interval '24 months'
  );

  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- `anon` is the role the publishable key maps to, and it is all the cron job
-- presents. Execution is open; the secret check inside each function is the
-- actual gate, and it is the same gate whoever calls.
revoke all on function private.assert_job_secret(text) from public, anon, authenticated;
revoke all on function public.retention_due(text) from public;
revoke all on function public.retention_mark_warned(text, uuid[]) from public;
revoke all on function public.retention_delete_expired(text) from public;

grant execute on function public.retention_due(text) to anon;
grant execute on function public.retention_mark_warned(text, uuid[]) to anon;
grant execute on function public.retention_delete_expired(text) to anon;
