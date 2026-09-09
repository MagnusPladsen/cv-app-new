-- Proves GDPR Art. 17 erasure is real: a deleted user leaves no rows behind,
-- and takes nobody else's data with them.
--
-- Run in the Supabase SQL editor. It rolls back, so it is safe against a
-- production database, and it raises an exception rather than returning a
-- row you might not read.
begin;

do $$
declare
  victim uuid := gen_random_uuid();
  bystander uuid := gen_random_uuid();
  leftover integer;
  bystander_rows integer;
begin
  -- Two users, so this also catches a cascade that deletes too much.
  insert into auth.users (id, instance_id, aud, role, email)
  values
    (victim, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'victim@example.test'),
    (bystander, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bystander@example.test');

  insert into public.cv_documents (id, user_id, name, doc, updated_at)
  values
    (gen_random_uuid(), victim, 'CV 1', '{"a":1}'::jsonb, 1),
    (gen_random_uuid(), victim, 'CV 2', '{"a":2}'::jsonb, 2),
    (gen_random_uuid(), bystander, 'Theirs', '{"a":3}'::jsonb, 3);

  -- Deleting the auth user is what delete_own_account() does. Exercising the
  -- cascade rather than a hand-written DELETE is the whole point: it is the
  -- cascade that the application relies on.
  delete from auth.users where id = victim;

  select count(*) into leftover from public.cv_documents where user_id = victim;
  if leftover <> 0 then
    raise exception 'ERASURE FAILED: % cv_documents rows survived deletion', leftover;
  end if;

  select count(*) into bystander_rows from public.cv_documents where user_id = bystander;
  if bystander_rows <> 1 then
    raise exception 'CASCADE TOO WIDE: another user lost data (% rows left)', bystander_rows;
  end if;

  raise notice 'OK: erasure removed every row for the deleted user, and only that user';
end $$;

-- The SQL editor does not surface RAISE NOTICE, so a passing run shows only
-- "Success. No rows returned" - which is easy to mistake for the script not
-- having done anything. This returns the verdict as an actual row.
select 'PASS: erasure removes every row for the deleted user, and only that user' as result;

rollback;
