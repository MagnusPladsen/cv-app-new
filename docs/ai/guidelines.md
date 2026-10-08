# The assistant: what it is, what it may touch, what it costs

CVApp's assistant answers questions about writing a CV and a søknad, and
suggests changes the person can apply with one press. It does not compute, it
does not decide, and it does not see anything the user has not handed it.

Three files, three jobs:

- **`lib/ai/knowledge.ts`** — what it knows about CVs and søknader. Edit that
  file to change its advice, then run `bun run ai-knowledge` to regenerate
  `docs/ai/knowledge.md`, which is now a mirror for reading. A serverless
  function cannot rely on reading the repo at runtime, so the text lives in
  TypeScript and the markdown follows it.
- **this file** — how it behaves, what it may call, what is sent and what is
  not.
- **`lib/ai/`** — the code that enforces all of it. Where the two disagree, the
  code wins and this file is wrong; fix it.

---

## The rules it works under

1. **Never invent a fact about the person.** No employer, no date, no number
   that was not given. If a bullet needs a figure, ask for the figure.
2. **Never do arithmetic.** Page counts, date ranges, gap lengths and the
   quality findings come from the app's own functions as tools. The model reads
   the result out; it does not derive it.
3. **Never lie on somebody's behalf.** No inventing experience, no inflating a
   title, no writing a reason for leaving that the user did not state.
4. **Answer in the user's language.** Norwegian unless the UI locale is `en`.
   Keep it short: a few sentences, then the suggestion.
5. **Suggest, never apply.** Every change comes back as structured data and
   lands behind an "Apply to form" button. Nothing is written to a CV by the
   model.
6. **Say when it does not know.** Especially about law, salary, the job market
   and who is hiring. It has no sources and no live data.
7. **No praise and no grading.** It improves text. It does not tell somebody
   they are a strong candidate.

## What it may call

The tools are the app's own verified logic, not reimplementations. Each one is
pure, runs server-side on data the client sent, and returns facts rather than
prose.

| Tool | Backed by | Returns |
|---|---|---|
| `quality_check` | `lib/quality/checks.ts` | The same findings the CV check panel shows |
| `page_count` | `lib/print/paper.ts` | Pages at the current paper and density |
| `help_topic` | the `help` message namespace | The plain-language tip a field already has, in the user's language |

There is deliberately **no knowledge lookup tool**. The whole of
`lib/ai/knowledge.ts` is already in the cached instruction prefix, and a tool
returning a slice of what the model is holding is a round trip paid for twice.

`quality_check` and `page_count` do not re-measure anything. The browser runs
`checkDocument` and `countPages` — the same functions the editor shows the user
— and sends the answers with the question; the tools read them back out. So the
model never does arithmetic, and the server never needs a document to answer
"how many pages am I on". See `lib/ai/tools.ts`.

Everything the model wants to change comes back as a suggestion instead:

```ts
type Suggestion =
  | { kind: 'bullet'; sectionId: string; entryId: string; index: number; value: string }
  | { kind: 'summary'; sectionId: string; value: string }
  | { kind: 'coverLetter'; field: 'body' | 'greeting' | 'closing'; value: string }
  | { kind: 'field'; path: 'personalia.title'; value: string }
```

The browser decides where a suggestion may land before it asks: it sends a list
of targets (`lib/ai/request.ts`), and the model can only point at one of them.
So a suggestion can only ever address the thing the person was already editing.

Each carries a one-line `why`. The UI renders the suggestion, the old value and
the new one, and applies exactly that object or nothing.

## What is sent, and what never is

The feature is opt-in per press. There is no background call, no "while you
type", and no whole-document upload.

**Sent** — only what the question needs:

- the text of the field being asked about, or the section being drafted
- the measured facts: page count, paper size, and the ids of the quality checks
  that fired — three values, not a document
- the job advert, when the user pastes one
- the conversation so far, in that chat only, held in the browser tab

**Never sent:**

- name, email, phone, place, links — replaced client-side with `[navn]`,
  `[e-post]`, `[telefon]` and `[sted]` by `lib/ai/redact.ts`, before the
  request is built
- the photograph. There is no field for it in the request schema
- anything matching the `nationalId` check. The request is refused outright and
  the user is told why
- any CV the user did not attach to the question
- anything at all until a button is pressed

The chat says this in plain words above the input, and the privacy policy says
it in the `ai` section: **what goes, to whom, and in which country.**

## Prompt caching

The prompt is built so the expensive half is cacheable. OpenAI caches the
longest matching **prefix**, so the order is load-bearing:

1. system prompt (this file's rules, compiled)
2. `knowledge.md`
3. tool definitions
4. — everything above is identical on every request and gets cached —
5. the user's attached text and question, newest last

Never interpolate anything per-user, per-session or per-time into steps 1-3.
A timestamp, a CV id or a locale switch in the prefix busts the cache for
everybody and turns a discount into full price. Locale is passed in the user
turn, not the system prompt.

## The budget

A $5/month roof on the OpenAI project is the backstop, not the plan. The app
limits before it gets there:

| Limit | Value | Why |
|---|---|---|
| chats per visitor per day | 3 | one bored person cannot drain the month |
| messages per chat | 12 | a loop cannot run away inside one conversation |
| messages per visitor per day | 25 | the same, across chats |
| global daily cap | 400 | the month survives a bad day |
| output tokens per answer | 300–900 by task | a runaway reply is refused, not billed |

The numbers live in `lib/ai/budget.ts` and are passed to the database function,
so there is one place to change them and no copy in SQL to forget.

The counters live in the database, not in process memory:
`lib/security/rate-limit.ts` is per-instance and says so in its own comment,
which makes it useless as a budget guard on serverless — five instances, five
times the limit. `public.ai_budget_take` checks and increments in one
statement, so two requests arriving together cannot both be the last one
through. A counter that cannot be reached **refuses**: an unreachable database
must not become an unlimited assistant.

**No web search.** It bills per call on top of tokens, and a few hundred
searches would be the whole month. `knowledge.md` is the answer instead.

## Models

Two models, picked by what they turned out to be good at rather than by price.
The bake-off is in `docs/ai/bakeoff-2026-10-08.md`: twenty real questions,
both models, same prompt and tools.

| Task | Model | Effort | Why |
|---|---|---|---|
| bullet, summary, sortLeftovers | `gpt-6-luna` | low | writes one concrete line and asks for the number it is missing — exactly the shape an Apply button needs |
| chat | `gpt-5-mini` | low | writes at length, offers alternatives, asks follow-ups. Wrong for a one-press suggestion, right for a conversation |
| coverLetter | `gpt-5-mini` | medium | `medium` produced a visibly better letter — greeting, bracketed placeholders, sign-off — at 527 output tokens against 349. On a bullet rewrite the same effort spent 112 reasoning tokens to produce the identical sentence, which is why nothing else uses it |

Each is the other's fallback, in `lib/ai/models.ts`. Not `gpt-5-nano`. The
project key reaches these two and nothing else, which is itself a useful guard.

## When it refuses

- A request to write something untrue → it says no and offers the true version.
- A fødselsnummer in the text → refused before the request is sent at all.
- A question about law, salary or the job market → one sentence saying it does
  not know, and where to ask.
- A question with nothing to do with CVs → a short redirect, no lecture.

## Where the route sits

`app/api/ai/route.ts` is the only place `OPENAI_API_KEY` exists, and the first
route handler in the app that reads a request body. That was a privacy
decision, recorded as Activity 4 in `docs/privacy/ropa.md` and enforced by
`lib/privacy/__tests__/no-server-cv.test.ts`, which now asserts there is
**exactly one** such handler. A second one is a policy question, not a merge.

Order of business in the route, and it matters: rate limit, then budget, then
validate, then spend money. The cheap refusals come first.
