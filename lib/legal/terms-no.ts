import type { LegalDocument } from './types'

/**
 * A separate document from the privacy policy on purpose: the GDPR spec is
 * explicit that privacy terms must not be buried inside terms of service.
 *
 * Accurate as written, and not reviewed by a lawyer. Norwegian consumer law
 * limits what a service may disclaim, so this deliberately promises little
 * rather than disclaiming much.
 */
export const TERMS_NO: LegalDocument = {
  title: 'Vilkår for bruk',
  lastUpdated: '2026-09-09',
  intro: [
    'CVApp er et verktøy for å lage din egen CV. Disse vilkårene gjelder når du bruker tjenesten.',
    'Hvordan vi behandler personopplysninger står i personvernerklæringen, ikke her.',
  ],
  sections: [
    {
      id: 'service',
      heading: 'Hva tjenesten er',
      body: [
        'CVApp lar deg lage, redigere og laste ned CV-er som PDF. Du kan bruke den uten konto. Logger du inn, lagres CV-ene på kontoen din slik at de følger deg mellom enheter.',
        'Vi er ikke en jobbsøkertjeneste. Vi sender ikke CV-en din noe sted, og vi formidler ikke kontakt med arbeidsgivere.',
      ],
    },
    {
      id: 'beta',
      heading: 'Beta og pris',
      body: [
        'CVApp er i beta og er gratis. Alt fungerer, og du kan lage og laste ned så mange CV-er du vil uten å betale.',
        'På sikt kommer en liten sum for å dekke server- og databasekostnader. Vi varsler i god tid før det skjer, og du blir aldri belastet uten å ha sagt ja.',
        'Beta betyr at ting kan endre seg. Vi kan endre eller fjerne funksjoner, men vi sletter aldri CV-ene dine uten at du ber om det.',
      ],
    },
    {
      id: 'your-content',
      heading: 'Innholdet ditt',
      body: [
        'CV-ene du lager er dine. Vi tar ingen rettigheter i dem, bruker dem ikke til noe annet, og viser dem ikke til noen.',
        'Du er ansvarlig for det du skriver. Det gjelder særlig opplysninger om andre: legger du inn en referanse, må du ha lov til å dele kontaktopplysningene deres.',
        'Du kan når som helst laste ned alt du har lagret, og slette det.',
      ],
    },
    {
      id: 'acceptable-use',
      heading: 'Hva du ikke kan bruke tjenesten til',
      body: [
        'Ikke legg inn ulovlig innhold, eller opplysninger om andre som du ikke har lov til å behandle.',
        'Ikke forsøk å få tilgang til andres CV-er, omgå sikkerhetstiltak, eller belaste tjenesten med automatiserte forespørsler i et omfang som går ut over andre brukere.',
        'Bryter du dette, kan vi stenge kontoen din. Du får beskjed, og du får mulighet til å laste ned innholdet ditt først med mindre det er ulovlig.',
      ],
    },
    {
      id: 'availability',
      heading: 'Tilgjengelighet',
      body: [
        'Tjenesten leveres som den er. Vi lover ikke at den alltid er tilgjengelig eller feilfri, og vi driver den ikke med noen garantert oppetid.',
        'CV-ene dine ligger i nettleseren din i tillegg til på kontoen din, så et driftsavbrudd gjør deg sjelden helt avskåret fra dem. Vi anbefaler likevel at du laster ned en kopi av CV-er du er avhengig av.',
      ],
    },
    {
      id: 'liability',
      heading: 'Ansvar',
      body: [
        'Vi er ikke ansvarlige for tap som følger av at tjenesten er utilgjengelig, eller av feil i tjenesten, ut over det som følger av ufravikelig norsk rett.',
        'Er du forbruker, begrenser ikke disse vilkårene rettighetene dine etter forbrukerlovgivningen.',
      ],
    },
    {
      id: 'termination',
      heading: 'Avslutning',
      body: [
        'Du kan slette kontoen din når som helst under Kontoen din. Da slettes alt innhold på den.',
        'Vi kan avslutte tjenesten. Skjer det, varsler vi i god tid slik at du rekker å laste ned CV-ene dine.',
      ],
    },
    {
      id: 'changes',
      heading: 'Endringer i vilkårene',
      body: [
        'Endres disse vilkårene, oppdaterer vi datoen øverst. Vesentlige endringer varsles i appen.',
      ],
    },
    {
      id: 'law',
      heading: 'Lovvalg',
      body: [
        'Norsk rett gjelder. Tvister behandles ved norske domstoler.',
        'Spørsmål om vilkårene: magnus_pladsen@hotmail.com',
      ],
    },
  ],
}
