# DPIA screening (Art. 35)

Art. 35(1) requires a data protection impact assessment where processing is
**likely to result in a high risk** to people's rights and freedoms. Screening
for that is itself an obligation: the record of having considered it is what
demonstrates compliance, and it has to exist whether or not the answer is yes.

**Screened:** 2026-09-11. Re-screen before any of the triggers at the bottom.

## The mandatory cases — Art. 35(3)

| Case | Applies? |
|---|---|
| (a) Systematic and extensive evaluation of personal aspects by automated processing, including profiling, with legal or similarly significant effects | **No.** CVApp evaluates nothing. It renders what the user typed. No scoring, no ranking, no matching to jobs, no AI |
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
| 3. Systematic monitoring | No | No analytics, no tracking, no error tracker — test-enforced by `lib/privacy/__tests__/no-tracking.test.ts` |
| 4. Sensitive data or data of a highly personal nature | **Yes** | A CV is personal by nature, and free text can hold health, trade-union or religious information |
| 5. Data processed on a large scale | No | See (b) above |
| 6. Matching or combining datasets | No | Nothing is combined. There is one dataset and it is the user's own |
| 7. Data concerning vulnerable subjects | **Partly** | Not a target group, but job-seeking includes people in precarious positions, and the employer–applicant relationship is asymmetric. CVApp has no relationship of power over the user — they can leave with their data at any time |
| 8. Innovative use or new technology | No | A form and a stylesheet |
| 9. Processing that prevents a right or the use of a service | No | No gate. The whole product works signed out |

**Roughly 1.5 of nine.** Below the threshold the guidance sets.

## Conclusion

**No DPIA is required at present.** The processing is limited, transparent, and
entirely under the user's control: they choose what to enter, they can use the
service without an account, they can export everything, and they can delete
everything themselves. There is no profiling, no monitoring, no combining, no
scale, and no third-party disclosure of CV content.

This is a screening conclusion, not legal advice, and it is exactly the sort of
judgement `docs/privacy/README.md` marks as out of scope for a coding agent.
Have it confirmed in the same review as the privacy policy.

## Re-screen when any of these becomes true

Each one flips a "no" above, and the first two flip it hardest:

- **Any inference about the user** — CV scoring, job matching, AI suggestions,
  "how strong is this CV". This crosses criteria 1 and 2 in a single feature
  and would likely require a DPIA on its own
- **Sharing a CV with a third party** — an employer portal, a public profile
  link, an application-sending feature. That is disclosure, and it changes the
  Art. 9 analysis entirely
- **Scale.** Tens of thousands of active users makes criterion 5 arguable, and
  with criterion 4 already met that is two
- **Analytics, an error tracker, or any tracking** — criterion 3
- **A referee-facing feature** — anything that contacts the people a user names
  turns the unresolved Art. 14 position in `ropa.md` into an immediate problem
- **Payment** — new data, a new processor, and a statutory retention period
