import type { GuideDocument } from './types'

/**
 * The CV guide, for people rather than for the assistant.
 *
 * Same advice as `lib/ai/knowledge.ts`, which is what the assistant answers
 * from - deliberately, so the page and the chat cannot contradict each other.
 * That file is written in English for a model; this is written in Norwegian
 * for somebody staring at an empty box.
 *
 * Opinionated on purpose. A guide that answers "det kommer an på" to every
 * question is no help at all.
 */
export const GUIDE_NO: GuideDocument = {
  title: 'Slik skriver du en CV som blir lest',
  lede: 'Det som faktisk gjelder i norsk arbeidsliv: lengde, rekkefølge, hva som skal stå øverst, og hva du trygt kan droppe.',
  tocHeading: 'På denne siden',
  faqHeading: 'Spørsmål folk stiller',
  intro: [
    'De fleste CV-er blir skummet, ikke lest. Den første halvsiden avgjør om resten blir sett på i det hele tatt. Det er hele grunnen til at rekkefølgen og de første linjene betyr mer enn utformingen.',
    'Denne siden er skrevet for norsk arbeidsliv. Mye av det du finner på engelsk gjelder et annet marked, med andre vaner rundt bilde, alder og referanser.',
  ],
  sections: [
    {
      id: 'lengde',
      heading: 'Hvor lang bør CV-en være?',
      body: [
        'Én side for de aller fleste, og alltid for deg med under fem år bak deg. To sider når du virkelig har mer å vise.',
        'Tre sider er et arkivskap, ikke en CV. Har du jobbet i tjue år, skal ikke alt med — de siste ti årene i detalj er nok, og eldre jobber blir til én linje eller ryker.',
        'Det er lettere å kutte enn å fylle. Stryk alt som ikke gjør deg til en bedre kandidat for akkurat denne stillingen.',
      ],
    },
    {
      id: 'rekkefolge',
      heading: 'Rekkefølge og struktur',
      body: [
        'Omvendt kronologisk: nyeste jobb først, nyeste utdanning først. Alt annet ser ut som om noe skjules.',
        'Vanlig rekkefølge: navn og kontakt, et kort sammendrag, arbeidserfaring, utdanning, ferdigheter, språk, og så det valgfrie.',
        'Er du nyutdannet, setter du utdanning over arbeidserfaring. Alle andre setter jobb først.',
        'Bruk overskrifter folk kjenner igjen: Om meg, Arbeidserfaring, Utdanning, Ferdigheter, Språk, Kurs og sertifiseringer, Verv, Referanser. Oppfinnsomme overskrifter gjør CV-en vanskeligere å skumme, ikke mer spennende.',
      ],
    },
    {
      id: 'toppen',
      heading: 'Hva som skal stå øverst',
      body: [
        'Navn, tittel, e-post, telefon og poststed. Det er alt.',
        'Tittelen er stillingen du søker på, ikke den du har. Den leses først og er det billigste å få riktig.',
        'Gateadresse er unødvendig. Poststed holder — arbeidsgivere sorterer på region, ikke på gate.',
        'Aldri fødselsnummer. Elleve siffer på en CV er identitetstyveri som venter på å skje, og ingen arbeidsgiver trenger det før det finnes en kontrakt. CVApp nekter å sende noe som ser slik ut til assistenten, og sier fra i kvalitetssjekken.',
        'Fødselsdato er tradisjon i Norge og blir stadig oftere droppet. Valgfritt, og det er ikke mistenkelig å la den stå igjen.',
      ],
    },
    {
      id: 'bilde',
      heading: 'Bilde: ja eller nei?',
      body: [
        'Vanlig i Norge, men aldri påkrevd.',
        'Bruk et nøytralt portrett i dagslys. Ikke feriebilde, ikke fest, ikke passfoto skannet på kontoret.',
        'Noen arbeidsgivere ber om CV uten bilde for å redusere skjevhet i utvelgelsen. Det er en grunn til å ha en av- og på-bryter, ikke en grunn til å få panikk.',
      ],
    },
    {
      id: 'erfaring',
      heading: 'Arbeidserfaring: resultater, ikke oppgaver',
      body: [
        'Per jobb: tittel, arbeidsgiver, sted, datoer — og så to til fire punkter.',
        'Punktene skal være resultater. «Kuttet lastetid med 42 prosent» slår «ansvar for ytelse». Et tall, en skala eller et utfall i hvert punkt som kan bære et.',
        'Start punktet med et verb: ledet, bygde, kuttet, innførte, lærte opp.',
        'Deltidsjobb ved siden av studiene teller, særlig tidlig i karrieren. Butikk, lager, barnehage — det viser at du møter opp.',
        'Har du ikke tall, skriv omfang i stedet: antall brukere, antall i teamet, hvor ofte. «Lærte opp fem nyansatte» er konkret uten å være oppdiktet.',
      ],
    },
    {
      id: 'hull',
      heading: 'Hull i CV-en, og andre vonde punkter',
      body: [
        'Forklar et hull med én kort linje i stedet for å la det stå som et hull: studier, sykdom, permisjon, reise, omsorg for familie, nedbemanning.',
        'Ingen skylder en arbeidsgiver en sykehistorie. «Sykemeldt» eller «permisjon» er et fullstendig svar.',
        'Ble du sagt opp i en nedbemanning, heter det nedbemanning, og det er helt normalt å skrive. Det sier noe om budsjettet, ikke om deg.',
        'Korte jobber er greit i en liste. Det som løfter øyenbryn er en rekke tremånedersjobber uten en eneste forklaring — ikke én av dem.',
      ],
    },
    {
      id: 'ferdigheter',
      heading: 'Ferdigheter og språk',
      body: [
        'Fem til tolv ferdigheter. En liste på tretti sier at ingenting er viktig.',
        'Bare det du kan bruke på jobb på mandag. «Microsoft Word» er ikke en ferdighet i 2026 med mindre stillingen handler om dokumenter.',
        'Vær ærlig om nivået. Du blir spurt om det i intervjuet.',
        'Språk: morsmål, flytende, god, grunnleggende. CEFR (A1–C2) forstås også og er mer presist.',
        'Norsk og engelsk er ofte underforstått i Norge. Ta dem med hvis nivået er verdt å vise — og ta alltid med alt annet du kan.',
      ],
    },
    {
      id: 'referanser',
      heading: 'Referanser',
      body: [
        '«Referanser oppgis på forespørsel» er den vanlige linjen, og den holder.',
        'Tar du dem med, må du spørre personen først — hver gang — og sjekke at nummeret fortsatt virker.',
        'En referanse er noen som har ledet deg eller jobbet ved siden av deg. Ikke en venn, ikke en slektning.',
      ],
    },
    {
      id: 'vedlegg',
      heading: 'Vitnemål, kurs og verv',
      body: [
        'Vitnemål og attester sendes på forespørsel. De skal ikke limes inn i CV-en.',
        'Kurs tar du bare med når de er relevante for stillingen. En liste med urelaterte kurs er fyllstoff.',
        'Førstegangstjeneste er verdt en linje, særlig tidlig i karrieren.',
        'Verv — styreverv, tillitsverv, frivillig arbeid — teller som erfaring når de viser ansvar eller ledelse.',
      ],
    },
    {
      id: 'ats',
      heading: 'Automatiske systemer (ATS)',
      body: [
        'Mange større norske arbeidsgivere leser CV-er gjennom et system før et menneske gjør det.',
        'Det betyr: ekte tekst, ikke et bilde av tekst. Vanlige overskrifter. Og ordene annonsen selv bruker.',
        'Speil annonsens ordbruk der det er sant. Står det «Java» og du har skrevet «JVM-språk», skriv Java.',
        'PDF-en fra CVApp er ekte tekst som kan søkes i og markeres. Det er delen de fleste designdrevne CV-byggerne roter til.',
      ],
    },
    {
      id: 'soknad',
      heading: 'Søknaden',
      body: [
        'Én side. Tre eller fire avsnitt. Ingen leser to sider.',
        'Første avsnitt: hvilken stilling, og hvorfor akkurat den. Bruk tittelen slik annonsen skriver den.',
        'Midten: to–tre ting du faktisk har gjort som svarer på det de ber om. Forklar CV-en, ikke gjenta den.',
        'Siste: hva du vil, at du er tilgjengelig, og at du gjerne kommer inn til en prat.',
        'Skriv den per annonse. En gjenbrukt søknad leses som en gjenbrukt søknad.',
        'Dropp «jeg er en strukturert og løsningsorientert person med stor arbeidskapasitet». Den står på annenhver søknad og sier ingenting. Én konkret setning om produktet deres slår et helt avsnitt om lidenskap.',
      ],
    },
  ],
  faq: [
    { question: 'Hvor lang bør CV-en min være?', answer: 'Én side for de fleste. To når du har rundt ti år bak deg.' },
    { question: 'Må jeg ha bilde på CV-en?', answer: 'Nei. Det er vanlig i Norge, men aldri påkrevd.' },
    { question: 'Skal jeg skrive fødselsnummeret mitt?', answer: 'Aldri. Ikke engang hvis det blir spurt om, før det finnes en kontrakt.' },
    { question: 'Må jeg oppgi adresse?', answer: 'Poststed holder. Gateadresse er unødvendig.' },
    { question: 'Skal alder eller fødselsdato med?', answer: 'Valgfritt. Det er normalt å la det stå igjen.' },
    { question: 'Hvor langt tilbake skal jeg gå?', answer: 'Rundt ti år i detalj. Eldre jobber blir til én linje.' },
    { question: 'Jeg har ingen erfaring. Hva skriver jeg?', answer: 'Deltidsjobber, studier, verv, frivillig arbeid og prosjekter. Alt teller.' },
    { question: 'Hvordan forklarer jeg et hull?', answer: 'Én kort linje: studier, permisjon, sykdom eller nedbemanning. Du skylder ingen detaljer.' },
    { question: 'Jeg ble sagt opp. Må jeg skrive det?', answer: 'Skriv det nøytrale faktum, nedbemanning hvis det var det. Ikke forklar lenge på papir.' },
    { question: 'Hvor mange punkter per jobb?', answer: 'To til fire, og hvert av dem et resultat.' },
    { question: 'Må jeg tilpasse CV-en per stilling?', answer: 'Ja. Minst tittelen, sammendraget og rekkefølgen på punktene.' },
    { question: 'Skal jeg liste referanser?', answer: '«Oppgis på forespørsel» holder. Spør personen først hvis du lister dem.' },
    { question: 'Norsk eller engelsk CV?', answer: 'Språket i annonsen. Ha begge hvis du søker i begge.' },
    { question: 'Skal jeg ha med hobbyer?', answer: 'Tre til fem, konkrete. De starter samtaler i intervjuet.' },
    { question: 'Hvor lang skal søknaden være?', answer: 'Én side, tre–fire avsnitt.' },
  ],
}
