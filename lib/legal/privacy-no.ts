import type { LegalDocument } from './types'

/**
 * This describes exactly what CVApp does, and is accurate as written. It has
 * not been reviewed by a lawyer. The GDPR spec puts the final wording of the
 * policy outside what a coding agent should settle: get a Norwegian privacy
 * review before CVApp charges money.
 */
export const PRIVACY_NO: LegalDocument = {
  title: 'Personvernerklæring',
  lastUpdated: '2026-09-09',
  intro: [
    'CVApp er et verktøy for å lage din egen CV. Denne erklæringen forklarer hvilke opplysninger vi behandler, hvorfor, hvor lenge, og hva du kan kreve.',
    'Kort fortalt: du kan bruke CVApp uten konto. Da ligger CV-ene dine bare i nettleseren din, og vi har ingenting om deg. Logger du inn, lagres CV-ene også på kontoen din slik at de følger deg mellom enheter.',
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
        'Selve nettstedet driftes av Vercel. Forespørsler kan behandles utenfor EØS, og da omfatter det tekniske opplysninger som IP-adresse og innloggingsinformasjonskapsler, ikke CV-innhold. Slik behandling skjer under EUs standardavtalevilkår og leverandørens sertifisering under EU-US Data Privacy Framework.',
      ],
    },
    {
      id: 'retention',
      heading: 'Hvor lenge vi lagrer',
      body: [
        'CV-er i nettleseren din ligger der til du sletter dem, tømmer nettleserdata eller logger ut.',
        'CV-er på kontoen din ligger der til du sletter CV-en eller kontoen. En slettet CV etterlater en tom rad med bare id og tidspunkt, slik at slettingen også slår gjennom på andre enheter du bruker.',
        'Sletter du kontoen, slettes kontoen og alle CV-ene på den umiddelbart og for godt.',
        'Tjenerlogger hos driftsleverandøren slettes etter leverandørens egne rutiner.',
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
        'CVApp bruker ikke kunstig intelligens. Ingenting av det du skriver sendes til en språkmodell eller til noen annen tredjepart for behandling.',
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
