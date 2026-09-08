-- GDPR Article 17. A person must be able to delete their account without
-- emailing anyone, and this is the smallest way to offer it: a definer
-- function scoped to auth.uid(), so the app needs no service-role key to call
-- it. cv_documents rows go with the user through the cascade on
-- cv_documents.user_id.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
