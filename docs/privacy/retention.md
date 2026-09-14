# Inactive-account retention

**24 months with no sign-in → an emailed warning → 30 days → the account and
every CV on it are deleted.** Signing in at any point cancels it silently.

GDPR Art. 5(1)(e): data may be kept no longer than the purpose needs. An
abandoned account has no purpose left.

## It does nothing until you finish two steps

The job refuses to run rather than half-run. Missing configuration returns
`{"ok":true,"skipped":"unconfigured"}` — deliberately, because deleting
accounts while unable to warn them is the one failure that cannot be undone.

### 1. Set the job secret in Postgres

Invent a long random string. `openssl rand -hex 32` is fine. Then, in the
Supabase SQL editor:

```sql
insert into private.job_secret (name, secret_hash)
values ('retention', encode(extensions.digest('<the secret>', 'sha256'), 'hex'))
on conflict (name) do update set secret_hash = excluded.secret_hash;
```

Only the hash is stored, so a database dump does not hand someone the ability
to trigger deletions.

### 2. Set three environment variables in Vercel

| Variable | Value |
|---|---|
| `SUPABASE_RETENTION_SECRET` | the same string, unhashed |
| `RESEND_API_KEY` | from the Resend dashboard |
| `RETENTION_FROM_EMAIL` | a sender on your verified domain, e.g. `noreply@pladsen.dev` |

`CRON_SECRET` is already set and guards the endpoint.

## Why the job holds no database key

A Vercel function that could list and delete users would need Supabase's
service-role key — which also reads every row of `cv_documents`. The privacy
policy says CV content never reaches a CVApp server, and
`lib/privacy/__tests__/no-server-cv.test.ts` exists to keep that true. Holding
a key capable of breaking it is a worse position than not holding one, even
while nothing uses it.

Instead the work is three `security definer` functions that check the shared
secret themselves. The job presents the same publishable key every visitor
already has.

What a leaked `SUPABASE_RETENTION_SECRET` would allow: triggering the deletion
of accounts that were already 24 months inactive and warned 30 days ago — the
ones the job was about to delete anyway. It grants no read access to anything,
and it cannot name a victim: the functions take no user id.

## What the person receives

One email, Norwegian and English in the same message. Nothing records which
language someone chose, and guessing from an email domain would be worse than
showing both.

It says what will happen, when, that signing in stops it, and that CVs saved
locally in their browser are untouched — most CVApp users never make an
account, and a warning that reads as a threat to work it cannot reach is worse
than none.

There is no tokenised "click here or lose your data" link. That is the shape of
every phishing email, and someone right to be suspicious of it should still be
able to act: the link is the site's front page.

## Failure behaviour

| If | Then |
|---|---|
| The email is rejected or the network fails | Nothing is marked warned. The account is offered again tomorrow, and **never deleted unwarned** |
| The secret is wrong or unset | Every function raises. Nothing is deleted |
| Resend is unreachable for a month | Deletions of already-warned accounts still proceed — they had their 30 days |
| More than 200 accounts are due | 200 today, the rest tomorrow. One free-tier cron run should not try to send ten thousand emails |

## Checking it works

The endpoint returns counts and no personal data:

```
{ "ok": true, "due": 0, "warned": 0, "failed": 0, "deleted": 0 }
```

Locally, `CRON_SECRET` unset, it is reachable without a header:

```
curl -s localhost:3001/api/retention
```

In production it returns 401 without `Authorization: Bearer $CRON_SECRET`, and
503 if `CRON_SECRET` itself is unset — a cron failing visibly in the dashboard
beats an open deletion endpoint nobody notices.

To watch it work without waiting two years, move a test account's
`last_sign_in_at` backwards in SQL and run the endpoint.

## What would make this wrong

- **Changing an interval in the migration without the constants in
  `lib/retention/policy.ts`.** The email states the numbers; if they drift it
  becomes a false promise and the person finds out by losing their CVs early.
  A test reads the migration and fails
- **Adding a join to `cv_documents` in `retention_due`.** The job would then be
  reading CVs. A test fails
- **Granting a policy on `retention_notices`.** RLS with no policy is the
  point: only the definer functions get in
