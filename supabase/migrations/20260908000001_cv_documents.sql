create table if not exists public.cv_documents (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Denormalised from doc->>'name' so a list of CVs can be read without
  -- pulling every payload.
  name text not null default '',

  -- The whole CvDocument, exactly as the zod schema serialises it. The client
  -- owns the shape; Postgres only stores it. Schema migrations therefore keep
  -- happening in lib/schema/migrations.ts on read, never here.
  doc jsonb not null,

  -- The editor's own clock, in ms, mirroring CvDocument.updatedAt. It is
  -- deliberately NOT now(): last-write-wins has to compare the same clock the
  -- editor stamps, or a fresh local edit looks older than the row it should
  -- replace. The cost is that a badly skewed device clock can lose an edit;
  -- for one person's own CVs that trade is worth it, and synced_at below
  -- keeps a truthful server-side record either way.
  updated_at bigint not null,

  -- Tombstone. Non-null means deleted; the row stays so other devices learn
  -- about the delete instead of resurrecting their stale copy.
  deleted_at bigint,

  synced_at timestamptz not null default now(),

  -- A CV with a photo is a megabyte or so of base64. Four is generous and
  -- still stops one account from eating the free tier's 500 MB.
  constraint cv_documents_doc_size check (pg_column_size(doc) < 4194304)
);

create index if not exists cv_documents_user_updated_idx
  on public.cv_documents (user_id, updated_at desc);

alter table public.cv_documents enable row level security;

drop policy if exists "Users read their own CVs" on public.cv_documents;
create policy "Users read their own CVs"
  on public.cv_documents for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own CVs" on public.cv_documents;
create policy "Users insert their own CVs"
  on public.cv_documents for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own CVs" on public.cv_documents;
create policy "Users update their own CVs"
  on public.cv_documents for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own CVs" on public.cv_documents;
create policy "Users delete their own CVs"
  on public.cv_documents for delete
  using ((select auth.uid()) = user_id);

-- Keep a server-side timestamp the client cannot forge, for support and for
-- spotting clock-skew problems later.
create or replace function public.touch_synced_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at = now();
  return new;
end;
$$;

drop trigger if exists cv_documents_touch_synced_at on public.cv_documents;
create trigger cv_documents_touch_synced_at
  before insert or update on public.cv_documents
  for each row execute function public.touch_synced_at();
