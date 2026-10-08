# Turning the assistant on

Three steps, none of them in this repository. Until all three are done,
`/api/ai` returns `503 {"error":"unconfigured"}` and the UI hides itself
rather than offering a button that cannot work. That is deliberate: a missing
counter must not become an unlimited assistant.

## 1. The $5 roof, in the OpenAI dashboard

Project → Limits → **Budget: $5/month**, hard. This is the backstop, not the
plan — the in-app counters in `lib/ai/budget.ts` are the plan. Set it anyway:
the counters are code, and code can have a bug.

The project key must reach `gpt-6-luna` and `gpt-5-mini`. Nothing else is
needed, and not reaching anything else is itself a useful guard.

## 2. The budget secret, in Postgres

Invent a long random string — `openssl rand -hex 32` — then, in the Supabase
SQL editor, after running `supabase/migrations/20261008000001_ai_budget.sql`:

```sql
insert into private.job_secret (name, secret_hash)
values ('ai', encode(extensions.digest('<the secret>', 'sha256'), 'hex'))
on conflict (name) do update set secret_hash = excluded.secret_hash;
```

Only the hash is stored. Same pattern as the retention job, and for the same
reason: the route holds a shared secret rather than a service-role key, so a
leak buys an attacker the ability to exhaust a daily counter — not the ability
to read a CV.

## 3. Two environment variables, in Vercel

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | the project key. **Never** with a `NEXT_PUBLIC_` prefix, and never in a client component |
| `AI_JOB_SECRET` | the same string as above, unhashed |

Locally both go in `.env.local`, which is gitignored. Neither belongs in a
chat window, a commit, or a screenshot.

## Checking it works

```
curl -s -X POST https://<host>/api/ai -H 'content-type: application/json' \
  -d '{"task":"chat","locale":"no","chatId":"test-00000001",
       "message":"Hvor lang bør CV-en min være?",
       "facts":{"pages":2,"paper":"a4","findings":[]}}'
```

- `503 unconfigured` — a variable or the secret is missing
- `429 budget` with a `reason` — the counters work, and you have hit one
- `200` with `usage.cached` well above zero on the second call — prompt
  caching is working, which is most of what makes this affordable

## What it costs to leave on

Per message: one cached prefix of roughly 2 600 tokens, plus the question,
plus 70–530 output tokens depending on the task. The global cap is 400
messages a day. The bake-off numbers behind those figures are in
`docs/ai/bakeoff-2026-10-08.md`, measured against both models.
