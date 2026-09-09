import type { LegalDocument } from './types'

/**
 * This describes exactly what CVApp does, and is accurate as written. It has
 * not been reviewed by a lawyer. The GDPR spec puts the final wording of the
 * policy outside what a coding agent should settle: get a Norwegian privacy
 * review before CVApp charges money.
 */
export const PRIVACY_NO: LegalDocument = {
  title: 'Personvernerklæring',
  lastUpdated: '2026-09-10',
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
        'Vi ber ikke om samtykke til noe annet heller, fordi vi ikke gjør noe annet: ingen analyse, ingen sporing, ingen markedsføring, ingen profilering.',
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
        'CV-ene og kontoopplysningene dine lagres i Frankfurt i Tyskland, altså innenfor EØS.',
        'Selve nettstedet driftes av Vercel, og forespørsler behandles i USA. Det omfatter tekniske opplysninger som IP-adresse og innloggingsinformasjonskapsler. CV-innholdet ditt går aldri gjennom en av våre servere: det ligger i nettleseren din og synkroniseres direkte til databasen i Frankfurt.',
        'Overføringen bygger på EUs standardavtalevilkår, med leverandørens sertifisering under EU-US Data Privacy Framework som et supplement. Du kan få kopi av standardavtalevilkårene ved å kontakte oss på adressen over.',
      ],
    },
    {
      id: 'retention',
      heading: 'Hvor lenge vi lagrer',
      body: [
        'CV-er i nettleseren din ligger der til du sletter dem, tømmer nettleserdata eller logger ut.',
        'CV-er på kontoen din ligger der til du sletter CV-en eller kontoen. En slettet CV etterlater en rad uten innhold, med id, tidspunkt og hvilken konto den tilhørte, slik at slettingen også slår gjennom på andre enheter du bruker. Raden er fortsatt en personopplysning knyttet til deg, og den slettes sammen med kontoen.',
        'Sletter du kontoen, slettes kontoen og alle CV-ene på den umiddelbart fra driftssystemene. Sikkerhetskopier hos databaseleverandøren roteres ut etter leverandørens rutiner, og slettede opplysninger gjenopprettes aldri til drift.',
        'Tjenerlogger hos driftsleverandøren slettes etter leverandørens rutiner.',
      ],
    },
    {
      id: 'cookies',
      heading: 'Informasjonskapsler og lagring i nettleseren',
      body: [
        'CVApp bruker ingen informasjonskapsler til analyse, sporing eller markedsføring, og har derfor ingen samtykkebanner.',
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
      heading: 'Automatiserte avgjørelser og kunstig intelligens',
      body: [
        'CVApp tar ingen automatiserte avgjørelser om deg, og driver ingen profilering.',
        'CVApp bruker ikke kunstig intelligens. Ingenting av det du skriver i CV-en sendes til en språkmodell, og vi sender ikke CV-innhold til noen tredjepart for behandling.',
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
