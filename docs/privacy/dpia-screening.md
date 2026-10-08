# DPIA screening (Art. 35)

Art. 35(1) requires a data protection impact assessment where processing is
**likely to result in a high risk** to people's rights and freedoms. Screening
for that is itself an obligation: the record of having considered it is what
demonstrates compliance, and it has to exist whether or not the answer is yes.

**Screened:** 2026-09-11. **Re-screened 2026-10-08**, because the assistant
tripped one of the triggers at the bottom of this document. The conclusion did
not change; the reasoning did, and the new reasoning is below.

## The mandatory cases — Art. 35(3)

| Case | Applies? |
|---|---|
| (a) Systematic and extensive evaluation of personal aspects by automated processing, including profiling, with legal or similarly significant effects | **No.** CVApp evaluates nobody. It renders what the user typed, and the assistant rewrites a sentence the user handed it. No scoring, no ranking, no matching to jobs, and `docs/ai/guidelines.md` forbids the assistant from assessing the person or predicting an outcome. Nothing it produces takes effect until the user presses it |
| (b) Processing of special categories or criminal-conviction data **on a large scale** | **No, on scale.** Special categories can appear in free text, so the first half is met; the second is not. "Large scale" under WP248 weighs the number of subjects, the volume, the duration and the geography. CVApp is a free beta with no meaningful user base, and each person's special-category data is a sentence they chose to type about themselves. Re-screen if the user base becomes substantial |
| (c) Systematic monitoring of a publicly accessible area on a large scale | **No.** No monitoring of any kind |

None of the mandatory cases is met.

## The nine criteria — WP248

The Art. 29 Working Party guidance, endorsed by the EDPB. Two or more met
usually indicates a DPIA.

| Criterion | Met? | Why |
|---|---|---|
| 1. Evaluation or scoring | No | Nothing is scored or inferred |
| 2. Automated decision-making with legal or similar effect | No | No decisions are made about anyone |
| 3. Systematic monitoring | No | Page counts and load times only (Vercel Web Analytics and Speed Insights: no cookie, no storage, no profile, nothing from a CV). No behavioural tracking and no error tracker — test-enforced by `lib/privacy/__tests__/no-tracking.test.ts` |
| 4. Sensitive data or data of a highly personal nature | **Yes** | A CV is personal by nature, and free text can hold health, trade-union or religious information |
| 5. Data processed on a large scale | No | See (b) above |
| 6. Matching or combining datasets | No | Nothing is combined. There is one dataset and it is the user's own |
| 7. Data concerning vulnerable subjects | **Partly** | Not a target group, but job-seeking includes people in precarious positions, and the employer–applicant relationship is asymmetric. CVApp has no relationship of power over the user — they can leave with their data at any time |
| 8. Innovative use or new technology | **Yes** | A large language model is new technology in WP248's sense, and this is the criterion the assistant moves. What it is used for is narrow — rewriting one sentence, answering one question — but the criterion asks about the technology, not the ambition |
| 9. Processing that prevents a right or the use of a service | No | No gate. The whole product works signed out |

**Roughly 2.5 of nine** since 2026-10-08, up from 1.5: criterion 8 now applies,
and criteria 4 and 7 were already partly met. Two met "usually indicates" a
DPIA, so this is no longer comfortably below the threshold and the conclusion
has to be argued rather than counted.

## Conclusion

**No DPIA is required at present**, including after the assistant. The count of
WP248 criteria is now at the level where the guidance says to look harder, so
this conclusion rests on the specifics rather than on the arithmetic:

- **The assistant makes no decision and no evaluation.** It returns prose and
  suggestions. A suggestion is inert until the user presses it, and they see
  the old text beside the new one first. Criteria 1 and 2 — the two that carry
  the most weight — remain not met
- **It is opt-in per press, one piece of text at a time.** Nothing is sent by
  opening the editor, by typing, or by having a CV. There is no background
  processing to be unaware of
- **It cannot receive a document.** `lib/ai/request.ts` has no field for one.
  An ordinary question carries one passage and three numbers. A review - its
  own press, labelled with what it sends - carries the CV's text in bounded
  pieces: at most 40 passages of 400 characters, with employers, dates, the
  references section, the photograph and every contact field left out. That is
  still a review of the person's own words, not a profile of them
- **The identifiers are removed before the request exists**, in the browser, by
  `lib/ai/redact.ts`, and a national identity number stops the request entirely
- **Nothing is retained.** No conversation is stored by CVApp, and the request
  is sent with `store: false`. There is no corpus to be breached
- **Scale is unchanged.** Criterion 5 is still not met, and the budget caps in
  `lib/ai/budget.ts` mean it cannot be met quietly

What would flip this is the assistant being pointed at the person rather than
at their sentence: scoring, ranking, matching to adverts, or reading a whole
document. Those are the first two triggers below, and they are exactly the
features not built.

This is a screening conclusion, not legal advice, and it is exactly the sort of
judgement `docs/privacy/README.md` marks as out of scope for a coding agent.
Have it confirmed in the same review as the privacy policy, and say that the
assistant exists when asking.

## Re-screen when any of these becomes true

Each one flips a "no" above, and the first two flip it hardest:

- **Any inference about the user** — CV scoring, job matching, "how strong is
  this CV", a readiness percentage. This crosses criteria 1 and 2 in a single
  feature and would likely require a DPIA on its own. The assistant shipped
  2026-10-08 deliberately does none of it; adding any of it is not an
  assistant improvement, it is a new activity
- **The assistant receiving a whole document** instead of one passage, or
  receiving the identifiers currently stripped in the browser. Either turns an
  opt-in sentence into an upload
- **Sharing a CV with a third party** — an employer portal, a public profile
  link, an application-sending feature. That is disclosure, and it changes the
  Art. 9 analysis entirely
- **Scale.** Tens of thousands of active users makes criterion 5 arguable, and
  with criterion 4 already met that is two
- **Analytics, an error tracker, or any tracking** — criterion 3
- **A referee-facing feature** — anything that contacts the people a user names
  turns the unresolved Art. 14 position in `ropa.md` into an immediate problem
- **Payment** — new data, a new processor, and a statutory retention period
