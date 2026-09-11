# Handling a rights request

What to do when someone emails asking for their data, or asking you to delete,
correct, restrict or stop something. Every right below carries a **one-month
deadline** from receipt (Art. 12(3)), extendable by two months for genuinely
complex requests — but only if you tell them within that first month.

Most requests need no work at all: the answer is a link to the page that does
it themselves. That is by design, and saying so is a complete answer.

## First: is it actually a rights request?

It does not have to say "GDPR", or name an article, or arrive at any particular
address. "Delete my account and everything on it" in a support email is an
erasure request. Treat anything that reads like one as one.

## Identify the person, without collecting more than you need

Art. 12(6) allows asking for more information only where there is **reasonable
doubt** about identity. For CVApp there usually is not:

- **If they can sign in**, they are identified. Point them at the self-service
  page and stop. Never ask a signed-in user to prove who they are
- **If the request comes from the email address on the account**, that is
  enough. Reply to that address and nowhere else
- **If it comes from some other address**, reply to the account address asking
  them to confirm. Do not ask for ID documents or a copy of a passport —
  collecting a stronger identifier than the account itself holds makes things
  worse, not safer

## Each right, and what it means here

| Right | Article | What to do |
|---|---|---|
| **Access** | 15 | Self-service: **Kontoen din → download everything as JSON** (`lib/privacy/export.ts`). It contains every field held, not a summary. Reply with the link and the note that server logs are held by the host and keyed to an IP address, not to their account |
| **Rectification** | 16 | Self-service: everything in a CV is editable in the editor. The only field not editable in-app is the account email — change it in Supabase and tell them you did |
| **Erasure** | 17 | Self-service: **Kontoen din → delete account**, typing `SLETT`. This removes the account row and every CV and tombstone referencing it, proven by `supabase/tests/delete_own_account.sql`. Record it in the log below. If they only want one CV gone, that is the delete button on the CV |
| **Restriction** | 18 | No self-service. Arises when they contest accuracy or object and you are considering it. In practice: stop syncing and stop touching the row while it is resolved. There is no "restricted" flag in the schema, so do it by hand — note the account in the log below, and do not process it further until resolved. **Tell them when the restriction is lifted**, which Art. 18(3) requires |
| **Portability** | 20 | Self-service: the same JSON download, plus per-CV export that imports back into CVApp. Both are machine-readable and structured, which is what Art. 20 asks for |
| **Objection** | 21 | Only applies to Art. 6(1)(f) processing, which for CVApp is Activity 3 in the ROPA: server logs. There is no way to serve the site without them, so the honest answer is that the objection cannot be met without ending the service for them — say that plainly, and tell them deleting the account stops everything else. There is **no direct marketing**, so the absolute right in Art. 21(2) never arises |
| **Withdraw consent** | 7(3) | Applies to special-category data typed into free text, held on Art. 9(2)(a). Withdrawing it means editing or deleting that content, which they can do themselves. Withdrawal is not retroactive and does not affect the lawfulness of what happened before |
| **Automated decisions** | 22 | Does not arise. CVApp makes none. Say so |

## Refusing, and the two ways it is allowed

You may refuse only if the request is **manifestly unfounded or excessive**,
typically because it is repetitive (Art. 12(5)). If you refuse:

- Say so within the month
- Say **why**
- Tell them they can complain to **Datatilsynet** and go to court

"I am busy" and "this is a free product" are not grounds. Neither is the
request being inconvenient.

## The reply

Answer in the language they wrote in. Norwegian and English are both fine.

A complete reply says: what you did, when, what data it covered, and that they
can complain to Datatilsynet if they are unhappy. It does not need to be
formal, and it should not be evasive.

## Log

Keep a line per request. This is the record that makes the backup
reconciliation in `ropa.md` possible, and it is the evidence that the
one-month deadline was met.

Personal data in the log itself should be the minimum that makes it useful: an
account id is better than an email address wherever it will do.

| Date received | Right | Account (id where possible) | Action | Date completed |
|---|---|---|---|---|
| _none yet_ | | | | |
