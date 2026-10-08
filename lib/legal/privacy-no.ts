import type { LegalDocument } from './types'

/**
 * This describes exactly what CVApp does, and is accurate as written. It has
 * not been reviewed by a lawyer. The GDPR spec puts the final wording of the
 * policy outside what a coding agent should settle: get a Norwegian privacy
 * review before CVApp charges money.
 */
export const PRIVACY_NO: LegalDocument = {
  title: 'Personvernerklæring',
  lastUpdated: '2026-10-08',
  intro: [
    'CVApp er et verktøy for å lage din egen CV. Denne erklæringen forklarer hvilke opplysninger vi behandler, hvorfor, hvor lenge, og hva du kan kreve.',
    'Kort fortalt: du kan bruke CVApp uten konto. Da ligger CV-ene dine bare i nettleseren din, og vi lagrer ikke noe av innholdet. Driftsleverandøren vår har likevel IP-adressen din i tjenerloggene, slik enhver nettside har. Logger du inn, lagres CV-ene også på kontoen din slik at de følger deg mellom enheter.',
  ],
  sections: [
    {
      id: 'controller',
      heading: 'Behandlingsansvarlig',
      body: [
        'Magnus Pladsen, privatperson. Det finnes ikke noe registrert selskap bak CVApp, og derfor heller ikke noe organisasjonsnummer.',
        'Kontakt i personvernsaker: magnus_pladsen@hotmail.com',
      ],
    },
    {
      id: 'what',
      heading: 'Hva vi behandler',
      body: [
        'Innholdet i CV-ene dine: navn, kontaktopplysninger, arbeidserfaring, utdanning, ferdigheter, språk, sertifiseringer, interesser, førerkort, referanser, og et valgfritt portrettbilde.',
        'Kontoopplysninger hvis du logger inn: e-postadressen din og hvilken innloggingstjeneste du brukte.',
        'Tekniske opplysninger fra driftsleverandøren, som IP-adresse og nettlesertype i tjenerlogger. CV-innhold logges aldri.',
        'En fullstendig liste over hvert enkelt felt finnes i datakartleggingen i kildekoden (docs/privacy/data-inventory.md).',
      ],
    },
    {
      id: 'basis',
      heading: 'Rettslig grunnlag',
      body: [
        'Å lagre og vise CV-en din er oppfyllelse av avtale, personvernforordningen artikkel 6 nr. 1 bokstav b. Det er selve tjenesten, og vi ber deg derfor ikke om samtykke til det.',
        'Vi teller sidevisninger med Vercel Web Analytics, og måler hvor raskt sidene lastet med Vercel Speed Insights, for å se hvilke deler av tjenesten som brukes og hvor det er tregt. Grunnlaget er berettiget interesse, artikkel 6 nr. 1 bokstav f: vi lagrer ingenting i nettleseren din, får ingen profil av deg, og ingenting av det du skriver i CV-en inngår.',
        'Ut over det ber vi ikke om samtykke til noe, fordi vi ikke gjør noe mer: ingen markedsføring, ingen profilering, ingen deling med annonsører.',
      ],
    },
    {
      id: 'free-text',
      heading: 'Fritekstfelt og særlige kategorier',
      body: [
        'CVApp har ingen felt for helse, religion, etnisitet, politisk oppfatning eller fagforeningsmedlemskap, og spør aldri om noe av det.',
        'Du kan likevel skrive hva du vil i fritekstfeltene, som sammendrag, beskrivelser og egendefinerte seksjoner. Det du skriver der er ditt valg. Vi anbefaler at du ikke oppgir opplysninger om helse, religion, etnisitet, politisk oppfatning eller fagforeningsmedlemskap med mindre det er nødvendig for stillingen du søker på.',
        'Velger du likevel å oppgi slike opplysninger, lagres de på grunnlag av det uttrykkelige samtykket du gir ved å skrive dem inn, jf. personvernforordningen artikkel 9 nr. 2 bokstav a. Avtale er ikke et gyldig grunnlag for særlige kategorier av personopplysninger. Du kan når som helst trekke samtykket tilbake ved å redigere eller slette CV-en, og da er opplysningene borte.',
      ],
    },
    {
      id: 'references',
      heading: 'Referanser og andre personer',
      body: [
        'Legger du inn en referanse, behandler vi opplysninger om en person som ikke selv bruker CVApp. Vi lagrer det du skriver, slik at det kan skrives ut på din CV. Vi kontakter aldri referansen din, og CV-en din er aldri offentlig tilgjengelig.',
        'Du er ansvarlig for å ha lov til å dele kontaktopplysningene deres. Er du oppført som referanse på en CV og vil ha opplysningene dine slettet, kontakt oss på adressen over.',
      ],
    },
    {
      id: 'processors',
      heading: 'Hvem som behandler opplysninger for oss',
      body: [
        'Vi bruker databehandlere til drift og lagring. Tabellen under viser hvem de er, hva de gjør, hvor behandlingen skjer, og om det foreligger en databehandleravtale.',
      ],
    },
    {
      id: 'transfers',
      heading: 'Overføring ut av EØS',
      body: [
        'Alt vi lagrer, lagres i EØS. CV-ene og kontoopplysningene dine ligger i Frankfurt i Tyskland, og nettstedet driftes fra Frankfurt.',
        'Det finnes én overføring ut av EØS, og bare én: bruker du assistenten, sendes teksten du ber om hjelp med til OpenAI i USA. Du trykker på en knapp hver gang, og navn, e-postadresse, telefonnummer og sted er fjernet før forespørselen lages. Se avsnittet om assistenten for hva som faktisk sendes.',
        'Grunnlaget for overføringen er det uttrykkelige samtykket du gir ved å trykke, personvernforordningen artikkel 49 nr. 1 bokstav a. OpenAI tilbyr i tillegg standard personvernbestemmelser (SCC).',
        'Ut over dette går CV-innholdet ditt aldri gjennom en av våre servere: det ligger i nettleseren din og synkroniseres direkte til databasen i Frankfurt.',
      ],
    },
    {
      id: 'retention',
      heading: 'Hvor lenge vi lagrer',
      body: [
        'CV-er i nettleseren din ligger der til du sletter dem, tømmer nettleserdata eller logger ut.',
        'CV-er på kontoen din ligger der til du sletter CV-en eller kontoen. En slettet CV etterlater en rad uten innhold, med id, tidspunkt og hvilken konto den tilhørte, slik at slettingen også slår gjennom på andre enheter du bruker. Raden er fortsatt en personopplysning knyttet til deg, og den slettes sammen med kontoen.',
        'Sletter du kontoen, slettes kontoen og alle CV-ene på den umiddelbart fra driftssystemene. Databaseleverandøren tar ingen automatiske sikkerhetskopier på abonnementet vi bruker i dag, så det finnes ingen kopi slettingen ikke når. Skulle vi gå over til et abonnement med daglige sikkerhetskopier, roteres de ut etter sju dager, og slettede opplysninger gjenopprettes aldri til drift.',
        'Tjenerlogger hos driftsleverandøren oppbevares i én time på abonnementet vi bruker i dag, og slettes så. På et betalt abonnement er det ett døgn.',
      ],
    },
    {
      id: 'cookies',
      heading: 'Informasjonskapsler og lagring i nettleseren',
      body: [
        'CVApp bruker ingen informasjonskapsler til analyse, sporing eller markedsføring, og har derfor ingen samtykkebanner. Besøksstatistikken vår lagrer ingenting på enheten din: Vercel Web Analytics teller sidevisning, hvilken side du kom fra, land, nettlesertype og skjermtype, og Speed Insights måler hvor lang tid siden brukte på å bli klar. Ingen av dem setter informasjonskapsel eller annen lagring. Da gjelder ikke kravet om samtykke etter ekomloven § 3-15.',
        'Vi lagrer CV-ene dine og noen få innstillinger i nettleserens lagring, og setter en informasjonskapsel for innlogging hvis du logger inn. Begge deler er strengt nødvendige for å levere tjenesten du har bedt om, og er unntatt kravet om samtykke etter ekomloven § 3-15.',
      ],
    },
    {
      id: 'rights',
      heading: 'Rettighetene dine',
      body: [
        'Innsyn: du kan laste ned alt vi har om deg som JSON, under Kontoen din.',
        'Dataportabilitet: den samme nedlastingen er maskinlesbar, og du kan i tillegg laste ned CV-ene dine i et format som kan importeres tilbake.',
        'Retting: du kan endre alle opplysninger i CV-ene dine når som helst i redigeringsverktøyet.',
        'Sletting: du kan slette en enkelt CV, eller hele kontoen din med alt innhold, under Kontoen din.',
        'Begrensning og innsigelse: kontakt oss på adressen over.',
        'Du kan klage til Datatilsynet hvis du mener vi behandler opplysningene dine i strid med regelverket. Se datatilsynet.no.',
        'Vi svarer innen én måned.',
      ],
    },
    {
      id: 'voluntary',
      heading: 'Må du oppgi opplysninger?',
      body: [
        'Nei. Du kan bruke CVApp uten konto, og du bestemmer selv hva du skriver i CV-en. Uten innhold blir det ingen CV, men det er den eneste konsekvensen.',
      ],
    },
    {
      id: 'automated',
      heading: 'Automatiserte avgjørelser',
      body: [
        'CVApp tar ingen automatiserte avgjørelser om deg i lovens forstand, og driver ingen profilering. Ingenting i appen avgjør noe om deg, rangerer deg eller vurderer deg som kandidat.',
        'CVApp bruker kunstig intelligens på ett sted: assistenten. Den foreslår tekst og svarer på spørsmål, og den endrer ingenting av seg selv. Hva som sendes, og hvor, står i avsnittet under.',
      ],
    },
    {
      id: 'ai',
      heading: 'Assistenten (kunstig intelligens)',
      body: [
        'CVApp har en assistent som kan svare på spørsmål om CV og søknad, og foreslå bedre formuleringer. Den er frivillig, og du trykker på en knapp hver gang. Ingenting sendes før du gjør det.',
        'Når du trykker, sendes tre ting: spørsmålet ditt, den teksten du ber om hjelp med, og de målingene appen selv har gjort — hvor mange sider CV-en er på, hvilket papirformat du bruker, og hvilke punkter kvalitetssjekken har funnet. Ingenting annet.',
        'Navn, e-postadresse, telefonnummer, sted og lenker fjernes i nettleseren din før forespørselen lages, og erstattes med [navn], [e-post], [telefon] og [sted]. Står det et fødselsnummer i teksten, sendes ingenting i det hele tatt, og du får beskjed om å ta det ut av CV-en.',
        'Portrettbildet ditt sendes aldri. Hele CV-en sendes aldri. Kontoopplysningene dine sendes aldri. Vi lagrer ingen samtale, verken hos oss eller hos leverandøren.',
        'Teksten behandles av OpenAI i USA. Forespørselen sendes med beskjed om ikke å lagres, og den brukes ikke til å trene modeller. Den delen av forespørselen som er lik for alle — instruksjonene våre — kan ligge i et hurtiglager hos OpenAI i opptil ett døgn, for å gjøre tjenesten billigere å drive.',
        'Assistenten foreslår, den endrer ingenting. Et forslag blir en endring først når du trykker på det, og du ser hva som endres før du gjør det.',
        'Grunnlaget er det uttrykkelige samtykket du gir ved å trykke, personvernforordningen artikkel 6 nr. 1 bokstav a, og artikkel 49 nr. 1 bokstav a for overføringen til USA. Du trekker samtykket tilbake ved å slutte å bruke assistenten. Det er ingenting å slette etterpå, fordi ingenting er lagret.',
      ],
    },
    {
      id: 'security',
      heading: 'Sikkerhet',
      body: [
        'All trafikk går over HTTPS. Opplysningene lagres kryptert hos databaseleverandøren.',
        'Tilgangen til CV-er er begrenset i databasen selv, slik at én bruker ikke kan lese en annens CV-er, uavhengig av hva applikasjonen ber om.',
        'CV-innhold logges aldri.',
      ],
    },
    {
      id: 'changes',
      heading: 'Endringer',
      body: [
        'Endres denne erklæringen, oppdaterer vi datoen øverst. Vesentlige endringer varsles i appen.',
      ],
    },
  ],
}
