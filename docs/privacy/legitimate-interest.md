# Legitimate interest assessment

Art. 6(1)(f) is only available if the interest is legitimate, the processing is
necessary for it, and it is not overridden by the rights of the people
involved. The three-part test has to be done and recorded *before* relying on
the basis — Recital 47 makes the balancing an explicit condition, not a
defence to raise later.

CVApp relies on legitimate interests for **one** activity: serving the site.
Everything else runs on contract (Art. 6(1)(b)) or, for special categories in
free text, explicit consent (Art. 9(2)(a)).

**Assessed:** 2026-09-11.

## Server logs and rate limiting — ROPA Activity 3

### 1. Purpose: is the interest legitimate?

Yes. Two interests, both recognised:

- **Delivering the service at all.** A web request carries an IP address by
  necessity; logging it is how a host operates and debugs a service
- **Security.** Rate limiting on authentication needs to count attempts per
  origin. Recital 49 names network and information security as a legitimate
  interest in terms

The interest is CVApp's and the host's, and it is also the users' — nobody
benefits from an unavailable service or an unprotected sign-in.

### 2. Necessity: is there a less intrusive way?

No, not meaningfully.

- The IP address is in the request before any code runs. Not logging it would
  mean asking the host to discard data it needs to route traffic
- Rate limiting keyed on something other than origin — an account, say —
  cannot protect sign-up or a sign-in attempt against an account that does not
  exist, which is precisely the attack
- The processing is already minimal: no CV content is logged, because none
  reaches the server. `lib/privacy/__tests__/no-server-cv.test.ts` enforces that

What is *not* claimed under this basis, and would fail the test if it were:
analytics, behavioural measurement, or anything about what a person did beyond
the request that carried it.

### 3. Balancing: do their rights override it?

No, and the reasons are specific rather than general:

| Weighs against | Weighs for |
|---|---|
| An IP address is personal data, collected without a choice | It is collected for the shortest useful period and never combined with anything |
| Collected from everyone, including people who never sign in | It is never linked to a CV or an account — the logs sit with the host, keyed to a request |
| The user cannot opt out and still use the site | This is what a visitor reasonably expects of any website. Recital 47 makes reasonable expectations the centre of the balance |
| | No profiling, no enrichment, no sale, no sharing. The logs never leave the host, and never leave the EEA |
| | The policy's `retention` section discloses it, so nothing here is hidden |

**Conclusion: legitimate interest holds.** The processing is what any visitor
expects, is the minimum that serves the purpose, and produces no consequence
for the individual.

## The right to object

Art. 21(1) gives an absolute right to object to Art. 6(1)(f) processing, and
the controller must stop unless it shows compelling legitimate grounds.

Here the honest answer is that the processing cannot be separated from serving
the page: no log, no request. `docs/privacy/rights-requests.md` says to tell an
objector exactly that, rather than pretending to a switch that does not exist.

Art. 21(2) — the absolute, no-balancing right to object to direct marketing —
never arises. There is none.

## Re-assess when

- Anything is keyed to a log entry that identifies a person, rather than a
  request
- Logs are used for anything beyond operations and security
- A processor is added that receives them
- Any feature claims Art. 6(1)(f) as its basis. Each one needs its own run
  through the three parts above, in its own section here
