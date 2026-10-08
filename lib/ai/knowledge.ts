/**
 * What the assistant answers from.
 *
 * The text lives here rather than in the markdown because a serverless
 * function cannot rely on reading a file out of the repository at runtime -
 * Next's file tracing is not a promise, and a missing knowledge base would
 * fail silently as "the assistant got vague".
 *
 * `docs/ai/knowledge.md` is the readable mirror. Edit this file, then run
 * `bun run ai-knowledge` to regenerate it; a test fails if the two drift.
 */
export const KNOWLEDGE = `# What the assistant knows about CVs and søknader

The reference the assistant answers from, instead of searching the web. Web
search is billed per call and would eat a $5 month in a few hundred questions;
this file is free, deterministic, and written for the Norwegian market rather
than whatever a search engine surfaces in English.

**Written 2026-10-08 from general knowledge of Norwegian hiring practice, not
from sourced research.** It is opinionated on purpose: an assistant that says
"it depends" to every question is no use to somebody staring at an empty box.
Correct anything here that you disagree with — the assistant repeats this file,
so this file is the place to argue.

---

## The CV

### Length

- **One page** for most people, and for anybody with under five years behind
  them. **Two** once there is genuinely more to say.
- Three pages is a filing cabinet, not a CV. The app's \`tooLong\` check warns at
  three.
- Norwegian employers skim. The first half of page one decides whether the rest
  is read at all.

### Order and structure

- **Reverse chronological**: newest job first, newest degree first. Anything
  else looks like something is being hidden.
- A usual order: name and contact, a short summary, work experience, education,
  skills, languages, then the optional extras.
- Somebody newly graduated puts education above work experience. Everybody else
  puts work first.
- Section names people recognise: Om meg, Arbeidserfaring, Utdanning,
  Ferdigheter, Språk, Kurs og sertifiseringer, Verv, Referanser.

### What goes at the top

- **Name, title, email, phone, town.** That is the lot.
- The **title** is the job being applied for, not the one currently held. It is
  the first thing read and the cheapest thing to get right.
- **Street address is unnecessary.** Town is enough; employers sort by region,
  not by street.
- **Never a fødselsnummer.** Eleven digits on a CV is identity theft waiting to
  happen, and no employer needs it before a contract exists. The app refuses to
  send anything matching that pattern to the assistant.
- Date of birth is traditional in Norway and increasingly left off. Optional,
  and leaving it off is not suspicious.

### Photo

- Common in Norway, **never required**.
- A plain daylight portrait. Not a holiday photo, not a party, not a passport
  scan.
- Some employers ask for a CV without one to reduce bias. That is a reason to
  have the switch, not a reason to panic.

### Work experience

- Per job: **title, employer, place, dates**, then **two to four bullets**.
- Bullets are **results, not duties**. "Kuttet lastetid med 42 prosent" beats
  "ansvar for ytelse". A number, a scale, or an outcome in every bullet that can
  carry one.
- Start bullets with a verb: ledet, bygde, kuttet, innførte, lærte opp.
- Ten years back is plenty. Older jobs become one line, or go.
- Part-time work while studying counts, especially early in a career. Shop
  floor, warehouse, kindergarten — it shows up for work.

### Gaps and awkward bits

- **Explain a gap in one short line** rather than leaving a hole: studies, sick
  leave, parental leave, travel, caring for family, redundancy.
- Nobody owes an employer a medical history. "Sykemeldt" or "permisjon" is a
  complete answer.
- Being let go in a redundancy round is **nedbemanning**, and writing it is
  normal.
- Short jobs are fine in a list. A string of three-month jobs with no
  explanation is what raises eyebrows, not any single one.

### Skills and languages

- **Five to twelve skills.** A list of thirty says nothing is important.
- Only what could be used at work on Monday. "Microsoft Word" is not a skill in
  2026 unless the job is about documents.
- Be honest about levels — they get asked about in the interview.
- Languages: morsmål, flytende, god, grunnleggende. CEFR (A1–C2) is also
  understood and is more precise.
- Norwegian and English are often assumed in Norway. Worth listing anyway if
  there is a level worth showing, and always worth listing anything else.

### References

- **"Referanser oppgis på forespørsel"** is the normal line, and it is enough.
- Listing them means asking those people first, every time, and checking the
  number still works.
- A referee is someone who managed or worked beside you. Not a friend, not a
  relative.

### Certificates, courses, military service

- Vitnemål and attester are **supplied on request**, not pasted into the CV.
- Courses only when relevant to the job. A list of unrelated courses is filler.
- Førstegangstjeneste is worth a line, especially early in a career.
- Verv — styreverv, tillitsverv, frivillig arbeid — count as experience when
  they show responsibility or leadership.

### ATS and keywords

- Many larger Norwegian employers read CVs through a system before a human does.
- That means: **real text, not a picture**; ordinary section headings; and the
  words the advert itself uses.
- Mirror the advert's vocabulary where it is true. If it says "Java" and the CV
  says "JVM-språk", write Java.
- The app's PDF export is real text, which is the part most design-led builders
  get wrong.

---

## The søknad (cover letter)

### Shape

- **One page. Three or four paragraphs.** Nobody reads two pages.
- **First paragraph:** which job, and why that one. Name the role as the advert
  names it.
- **Middle:** two or three things you have actually done that match what they
  asked for. Explain the CV, do not repeat it.
- **Last:** what you want, that you are available, and that you would gladly
  come in.
- Address the company, not yourself at length. If the advert names a person, use
  the name.

### Tone

- Plain Norwegian. No "jeg er en strukturert og løsningsorientert person med
  stor arbeidskapasitet" — it is on every second letter and says nothing.
- Specific beats enthusiastic. One concrete sentence about their product beats a
  paragraph about passion.
- Write it per advert. A recycled letter reads like one.

### What goes in the header

- Name and contact at the top, the employer and the role below it, then a date
  and a place.
- "Søknad på stilling som <tittel>" as a subject line is standard and helps when
  a human is sorting a pile.

---

## Questions people actually ask

Short answers the assistant can give directly. The longer reasoning above backs
each one.

| Question | Short answer |
|---|---|
| How long should my CV be? | One page, two once you have ten years. |
| Do I need a photo? | No. Common in Norway, never required. |
| Should I put my fødselsnummer? | Never. Not even on request before a contract. |
| My address? | Town is enough. |
| Age or date of birth? | Optional. Leaving it off is normal now. |
| How far back do I go? | About ten years in detail; older jobs get one line. |
| I have no experience. | Part-time work, studies, verv, frivillig arbeid, projects. All count. |
| How do I explain a gap? | One short line. Studies, leave, illness, redundancy — no detail owed. |
| I was fired. | Write the neutral fact, nedbemanning if that is what it was. Do not explain at length on paper. |
| Should I list hobbies? | Three to five, specific. They start conversations in interviews. |
| How many bullets per job? | Two to four, each one a result. |
| Should I tailor per job? | Yes. At minimum the title, the summary and the bullet order. |
| Does my CV need keywords? | Use the advert's own words where they are true. |
| Should I list references? | "Oppgis på forespørsel" is enough. Ask first if you list them. |
| Norwegian or English CV? | The language of the advert. Keep both if you apply in both. |
| Should I include my grades? | Only if newly graduated and they are good. |
| What about a personal website? | Link it if there is something to see. Otherwise skip. |
| How do I start the søknad? | The job and why that one, in the first two sentences. |
| How long should the søknad be? | One page, three or four paragraphs. |
| Can I reuse my søknad? | Rewrite the first and middle paragraphs per advert, always. |

---

## What the assistant must not claim

- **It cannot see the job market.** No claims about demand, salary levels, who
  is hiring, or how many applicants a post gets.
- **It has no sources.** Everything here is convention, not law. Where something
  is a legal matter — discrimination, what an employer may ask — it says so and
  stops.
- **It does not grade people.** No "you are a strong candidate". It improves
  text; it does not predict outcomes.
- **It does not invent experience.** If a bullet needs a number the user has not
  given, it asks for the number rather than inventing one.
`
