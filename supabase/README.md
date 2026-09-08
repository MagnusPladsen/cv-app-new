# Supabase

Migrations here are the source of truth for the CVApp database schema. Apply
them in order through the dashboard SQL editor (or `bunx supabase db push`
once the CLI is linked).

- Region: EU. The rows are personal data.
- Keys: only the publishable key ever reaches the app. There is no
  service-role key in this codebase, and adding one needs a deliberate
  decision, not a convenient import.
- RLS is on for every table. A Supabase table without RLS is public.
- A daily Vercel cron hits `/api/keep-alive` so the free project is never
  paused for inactivity. If sign-in starts failing across the board, check
  the project is not paused before debugging anything else.

## Applying a migration

1. Open the SQL editor for the project.
2. Paste the whole file and run it. Every statement is written to be safe to
   run twice, so a partial application can be retried.
3. Confirm the RLS badge is on for any new table in the Table Editor.
