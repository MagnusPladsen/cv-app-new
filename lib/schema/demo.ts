import type { CvDocument, Section } from './cv'
import { createEmptyDocument, type CreateDocumentInput, type FactoryDeps } from './defaults'

/** A neutral placeholder portrait, so templates with a photo slot can be reviewed. */
const DEMO_PHOTO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMjQwIiB2aWV3Qm94PSIwIDAgMjQwIDI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjOTRhM2I4Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIyNDAiIGZpbGw9InVybCgjZykiLz48Y2lyY2xlIGN4PSIxMjAiIGN5PSI5NiIgcj0iNDIiIGZpbGw9IiNmOGZhZmMiLz48cGF0aCBkPSJNNDAgMjMyYzAtNDYgMzYtNzQgODAtNzRzODAgMjggODAgNzR6IiBmaWxsPSIjZjhmYWZjIi8+PC9zdmc+'

/**
 * A realistic, fully populated Norwegian CV used for looking at templates and
 * for gallery thumbnails.
 *
 * It deliberately overflows a single A4 page: an empty or thin CV hides column
 * balance, page breaks, long-name wrapping and sidebar overflow, which are
 * exactly the things a template review needs to catch.
 */
export function createDemoDocument(
  input: CreateDocumentInput = {},
  deps?: FactoryDeps,
): CvDocument {
  const doc = createEmptyDocument(input, deps)
  const id = (suffix: string) => `${doc.id}-${suffix}`

  doc.name = 'Demo'
  doc.personalia = {
    ...doc.personalia,
    firstName: 'Ingrid',
    lastName: 'Bjørnstad Halvorsen',
    title: 'Senior frontendutvikler og teamleder',
    email: 'ingrid.halvorsen@example.no',
    phone: '+47 918 27 445',
    city: 'Oslo',
    country: 'Norge',
    showPhoto: true,
    photo: { dataUrl: DEMO_PHOTO },
    links: [
      { id: id('l1'), label: 'github.com/ingridbh', url: 'https://github.com/ingridbh' },
      { id: id('l2'), label: 'linkedin.com/in/ingridbh', url: 'https://linkedin.com/in/ingridbh' },
      { id: id('l3'), label: 'ingrid.dev', url: 'https://ingrid.dev' },
    ],
  }

  doc.sections = doc.sections.map((section): Section => {
    switch (section.type) {
      case 'summary':
        return {
          ...section,
          enabled: true,
          text:
            'Frontendutvikler med ti års erfaring fra produktteam i finans og offentlig sektor. ' +
            'Bygger tilgjengelige grensesnitt i TypeScript og React, og trives best der design og ' +
            'utvikling møtes. Har ledet team på fire og satt opp designsystem brukt av seks produkter.',
        }

      case 'experience':
        return {
          ...section,
          enabled: true,
          entries: [
            {
              id: id('e1'),
              role: 'Senior frontendutvikler',
              organisation: 'Nordvest Digital',
              location: 'Oslo',
              from: '2021-08',
              to: '',
              current: true,
              descriptionMode: 'bullets',
              description:
                'Ledet et team på fire gjennom en full replattforming til Next.js\n' +
                'Kuttet lastetid på hovedflyten med 42 prosent\n' +
                'Innførte designsystem som nå brukes av seks produkter',
            },
            {
              id: id('e2'),
              role: 'Frontendutvikler',
              organisation: 'Statens pensjonskasse',
              location: 'Oslo',
              from: '2018-01',
              to: '2021-07',
              current: false,
              descriptionMode: 'bullets',
              description:
                'Bygde selvbetjeningsløsning brukt av 240 000 medlemmer\n' +
                'Tok løsningen fra WCAG 2.0 A til 2.1 AA\n' +
                'Etablerte komponentbibliotek og skriftlig kodestandard',
            },
            {
              id: id('e3'),
              role: 'Utvikler',
              organisation: 'Bekk Consulting',
              location: 'Oslo',
              from: '2015-09',
              to: '2017-12',
              current: false,
              descriptionMode: 'bullets',
              description:
                'Leverte kundeprosjekter i bank og varehandel\n' +
                'Fast bidragsyter til intern fagdag om frontendarkitektur',
            },
          ],
        }

      case 'education':
        return {
          ...section,
          enabled: true,
          entries: [
            {
              id: id('u1'),
              role: 'Master i informatikk',
              organisation: 'Universitetet i Oslo',
              location: 'Oslo',
              from: '2013-08',
              to: '2015-06',
              current: false,
              descriptionMode: 'prose',
              description: 'Spesialisering i menneske-maskin-interaksjon.',
            },
            {
              id: id('u2'),
              role: 'Bachelor i informatikk',
              organisation: 'NTNU',
              location: 'Trondheim',
              from: '2010-08',
              to: '2013-06',
              current: false,
              descriptionMode: 'bullets',
              description: '',
            },
          ],
        }

      case 'skills':
        return {
          ...section,
          enabled: true,
          items: [
            { id: id('s1'), name: 'TypeScript', level: 5 },
            { id: id('s2'), name: 'React', level: 5 },
            { id: id('s3'), name: 'Next.js', level: 4 },
            { id: id('s4'), name: 'Tilgjengelighet (WCAG)', level: 4 },
            { id: id('s5'), name: 'Designsystemer', level: 4 },
            { id: id('s6'), name: 'Node.js', level: 3 },
            { id: id('s7'), name: 'Figma', level: 3 },
            { id: id('s8'), name: 'Rust' },
          ],
        }

      case 'languages':
        return {
          ...section,
          enabled: true,
          items: [
            { id: id('g1'), name: 'Norsk', level: 'native' },
            { id: id('g2'), name: 'Engelsk', level: 'c1' },
            { id: id('g3'), name: 'Tysk', level: 'b1' },
          ],
        }

      case 'certifications':
        return {
          ...section,
          enabled: true,
          entries: [
            {
              id: id('c1'),
              name: 'Certified Professional in Accessibility Core Competencies',
              issuer: 'IAAP',
              date: '2023-05',
            },
            {
              id: id('c2'),
              name: 'AWS Certified Solutions Architect – Associate',
              issuer: 'Amazon Web Services',
              date: '2021-11',
            },
          ],
        }

      case 'interests':
        return {
          ...section,
          enabled: true,
          items: ['Klatring', 'Langrenn', 'Fotografi', 'Brettspill', 'Baking', 'Kortreist mat'],
        }

      case 'references':
        return {
          ...section,
          enabled: true,
          entries: [
            {
              id: id('r1'),
              name: 'Kari Solberg',
              role: 'Utviklingssjef',
              organisation: 'Nordvest Digital',
              email: 'kari.solberg@example.no',
              phone: '+47 900 11 223',
            },
          ],
        }

      default:
        return section
    }
  })

  return doc
}
