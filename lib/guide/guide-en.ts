import type { GuideDocument } from './types'

/** The English guide. Same advice, same section ids, for the Norwegian market. */
export const GUIDE_EN: GuideDocument = {
  title: 'How to write a CV that gets read',
  lede: 'What actually applies in Norwegian hiring: length, order, what belongs at the top, and what you can safely leave out.',
  tocHeading: 'On this page',
  faqHeading: 'Questions people ask',
  intro: [
    'Most CVs are skimmed, not read. The first half-page decides whether the rest is looked at at all. That is the whole reason the order and the opening lines matter more than the styling.',
    'This page is written for hiring in Norway. Much of the English-language advice online describes a different market, with different habits around photographs, age and references.',
  ],
  sections: [
    {
      id: 'lengde',
      heading: 'How long should it be?',
      body: [
        'One page for almost everybody, and always if you have under five years behind you. Two pages once you genuinely have more to show.',
        'Three pages is a filing cabinet, not a CV. Twenty years of work does not mean twenty years on paper — the last ten in detail is plenty, and older jobs become one line or go.',
        'Cutting is easier than filling. Strike anything that does not make you a better candidate for this particular job.',
      ],
    },
    {
      id: 'rekkefolge',
      heading: 'Order and structure',
      body: [
        'Reverse chronological: newest job first, newest degree first. Anything else looks like something is being hidden.',
        'A usual order: name and contact, a short summary, work experience, education, skills, languages, then the optional extras.',
        'If you have just graduated, education goes above work experience. Everybody else puts work first.',
        'Use headings people recognise: Om meg, Arbeidserfaring, Utdanning, Ferdigheter, Språk, Kurs og sertifiseringer, Verv, Referanser. Inventive headings make a CV harder to skim, not more interesting.',
      ],
    },
    {
      id: 'toppen',
      heading: 'What belongs at the top',
      body: [
        'Name, title, email, phone and town. That is the lot.',
        'The title is the job you are applying for, not the one you hold. It is read first and it is the cheapest thing to get right.',
        'A street address is unnecessary. Town is enough — employers sort by region, not by street.',
        'Never a fødselsnummer. Eleven digits on a CV is identity theft waiting to happen, and no employer needs it before a contract exists. CVApp refuses to send anything matching that pattern to the assistant, and the quality check flags it.',
        'A date of birth is traditional in Norway and increasingly left off. Optional, and leaving it out is not suspicious.',
      ],
    },
    {
      id: 'bilde',
      heading: 'Photograph: yes or no?',
      body: [
        'Common in Norway, never required.',
        'Use a plain daylight portrait. Not a holiday photo, not a party, not a passport scan.',
        'Some employers ask for a CV without one to reduce bias in shortlisting. That is a reason to have a switch, not a reason to panic.',
      ],
    },
    {
      id: 'erfaring',
      heading: 'Experience: results, not duties',
      body: [
        'Per job: title, employer, place, dates — then two to four bullets.',
        'Bullets are results. "Kuttet lastetid med 42 prosent" beats "ansvar for ytelse". A number, a scale or an outcome in every bullet that can carry one.',
        'Start each bullet with a verb: led, built, cut, introduced, trained.',
        'Part-time work alongside studies counts, especially early on. Shop floor, warehouse, kindergarten — it shows you turn up.',
        'No numbers? Give scale instead: how many users, how many in the team, how often. "Trained five new starters" is concrete without being invented.',
      ],
    },
    {
      id: 'hull',
      heading: 'Gaps, and the other awkward bits',
      body: [
        'Explain a gap in one short line rather than leaving a hole: studies, illness, parental leave, travel, caring for family, redundancy.',
        'Nobody owes an employer a medical history. "Sykemeldt" or "permisjon" is a complete answer.',
        'Being let go in a redundancy round is nedbemanning, and writing it is normal. It says something about the budget, not about you.',
        'Short jobs are fine in a list. What raises eyebrows is a run of three-month jobs with no explanation at all — not any single one.',
      ],
    },
    {
      id: 'ferdigheter',
      heading: 'Skills and languages',
      body: [
        'Five to twelve skills. A list of thirty says nothing is important.',
        'Only what you could use at work on Monday. "Microsoft Word" is not a skill in 2026 unless the job is about documents.',
        'Be honest about the level. You will be asked about it in the interview.',
        'Languages: morsmål, flytende, god, grunnleggende. CEFR (A1–C2) is also understood and is more precise.',
        'Norwegian and English are often assumed in Norway. List them if there is a level worth showing — and always list anything else.',
      ],
    },
    {
      id: 'referanser',
      heading: 'References',
      body: [
        '"Referanser oppgis på forespørsel" is the normal line, and it is enough.',
        'If you do list them, you have to ask those people first — every time — and check the number still works.',
        'A referee is somebody who managed you or worked beside you. Not a friend, not a relative.',
      ],
    },
    {
      id: 'vedlegg',
      heading: 'Certificates, courses and voluntary work',
      body: [
        'Vitnemål and attester are supplied on request. They do not get pasted into the CV.',
        'Include courses only when they are relevant to the job. A list of unrelated courses is filler.',
        'Military service — førstegangstjeneste — is worth a line, especially early in a career.',
        'Verv — board positions, union roles, volunteering — count as experience when they show responsibility or leadership.',
      ],
    },
    {
      id: 'ats',
      heading: 'Applicant tracking systems',
      body: [
        'Many larger Norwegian employers read CVs through a system before a human does.',
        'That means: real text, not a picture of text. Ordinary headings. And the words the advert itself uses.',
        'Mirror the advert’s vocabulary where it is true. If it says "Java" and you wrote "JVM language", write Java.',
        'The PDF CVApp exports is real text you can search and select. That is the part most design-led CV builders get wrong.',
      ],
    },
    {
      id: 'soknad',
      heading: 'The application letter',
      body: [
        'One page. Three or four paragraphs. Nobody reads two pages.',
        'First paragraph: which job, and why that one. Use the title the way the advert writes it.',
        'Middle: two or three things you have actually done that answer what they asked for. Explain the CV, do not repeat it.',
        'Last: what you want, that you are available, and that you would gladly come in.',
        'Write it per advert. A recycled letter reads like a recycled letter.',
        'Drop "jeg er en strukturert og løsningsorientert person med stor arbeidskapasitet". It is on every second letter and says nothing. One concrete sentence about their product beats a paragraph about passion.',
      ],
    },
  ],
  faq: [
    { question: 'How long should my CV be?', answer: 'One page for most people. Two once you have around ten years behind you.' },
    { question: 'Do I need a photo?', answer: 'No. Common in Norway, never required.' },
    { question: 'Should I put my fødselsnummer on it?', answer: 'Never. Not even on request, before a contract exists.' },
    { question: 'Do I need my address?', answer: 'Town is enough. A street address is unnecessary.' },
    { question: 'Age or date of birth?', answer: 'Optional. Leaving it off is normal.' },
    { question: 'How far back should I go?', answer: 'About ten years in detail. Older jobs become one line.' },
    { question: 'I have no experience. What do I write?', answer: 'Part-time jobs, studies, verv, volunteering and projects. All of it counts.' },
    { question: 'How do I explain a gap?', answer: 'One short line: studies, leave, illness or redundancy. You owe no detail.' },
    { question: 'I was made redundant. Do I have to say so?', answer: 'Write the neutral fact, nedbemanning if that is what it was. Do not explain at length on paper.' },
    { question: 'How many bullets per job?', answer: 'Two to four, each one a result.' },
    { question: 'Should I tailor it per job?', answer: 'Yes. At minimum the title, the summary and the order of the bullets.' },
    { question: 'Should I list references?', answer: '"Oppgis på forespørsel" is enough. Ask the person first if you list them.' },
    { question: 'Norwegian or English CV?', answer: 'The language of the advert. Keep both if you apply in both.' },
    { question: 'Should I include hobbies?', answer: 'Three to five, specific. They start conversations in interviews.' },
    { question: 'How long should the application letter be?', answer: 'One page, three or four paragraphs.' },
  ],
}
