import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CvDocument } from '@/components/cv/CvDocument'
import { buildPrintTitle } from '@/lib/print/build-print-html'
import { printCvNode } from '@/lib/print/print-cv'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'

/** A realistic, fully-populated Norwegian CV. */
function populatedDocument(): CvDocumentData {
  let counter = 0
  const doc = createEmptyDocument(
    { name: 'Frontend, Oslo' },
    { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 },
  )

  doc.personalia = {
    ...doc.personalia,
    firstName: 'Ola',
    lastName: 'Nordmann',
    title: 'Frontendutvikler',
    email: 'ola@example.no',
    phone: '+47 900 00 000',
    city: 'Oslo',
    country: 'Norge',
    links: [{ id: 'l1', label: 'GitHub', url: 'https://github.com/ola' }],
  }

  doc.sections = doc.sections.map((section) => {
    if (section.type === 'summary') {
      return { ...section, enabled: true, text: 'Erfaren frontendutvikler.' }
    }
    if (section.type === 'experience') {
      return {
        ...section,
        enabled: true,
        entries: [
          {
            id: 'e1',
            role: 'Senior utvikler',
            organisation: 'Acme AS',
            location: 'Oslo',
            from: '2022-01',
            to: '',
            current: true,
            description: 'Ledet et team på fire\nKuttet lastetid med 40 %',
            descriptionMode: 'bullets',
          },
        ],
      }
    }
    if (section.type === 'skills') {
      return {
        ...section,
        enabled: true,
        items: [{ id: 'i1', name: 'TypeScript', level: 5 }],
      }
    }
    return section
  })

  return doc
}

/** Captures the HTML the print pipeline would hand the browser. */
async function capturePrintHtml(doc: CvDocumentData): Promise<string> {
  const { container } = render(<CvDocument document={doc} />)
  const node = container.querySelector<HTMLElement>('.cv-doc')
  expect(node).not.toBeNull()

  let captured = ''
  await printCvNode(
    {
      node: node!,
      title: buildPrintTitle(doc.personalia.firstName, doc.personalia.lastName),
      paper: doc.paper,
      lang: doc.language,
    },
    {
      waitForLoad: async (iframe) => void (captured = iframe.srcdoc),
      waitForFonts: async (iframe) => void iframe,
      invokePrint: (iframe) => void iframe,
      cleanupDelayMs: 0,
    },
  )

  return captured
}

describe('CV export, end to end', () => {
  it('carries the personalia into the printed document', async () => {
    const html = await capturePrintHtml(populatedDocument())
    expect(html).toContain('Ola Nordmann')
    expect(html).toContain('Frontendutvikler')
    expect(html).toContain('ola@example.no')
  })

  it('carries section content and localized headings', async () => {
    const html = await capturePrintHtml(populatedDocument())
    expect(html).toContain('Arbeidserfaring')
    expect(html).toContain('Senior utvikler')
    expect(html).toContain('Acme AS')
    expect(html).toContain('jan. 2022 – nå')
  })

  it('renders the description as real list items, which is what parsers read', async () => {
    const html = await capturePrintHtml(populatedDocument())
    expect(html).toContain('<li>Ledet et team på fire</li>')
    expect(html).toContain('<li>Kuttet lastetid med 40 %</li>')
  })

  it('emits text rather than images, so the PDF stays selectable', async () => {
    const html = await capturePrintHtml(populatedDocument())
    expect(html).not.toContain('<canvas')
    expect(html).not.toContain('<img')
  })

  it('carries the theme tokens and page geometry inline', async () => {
    const html = await capturePrintHtml(populatedDocument())
    expect(html).toContain('--cv-accent')
    expect(html).toContain('--cv-page-width: 210mm')
    expect(html).toContain('@page { size: A4; margin: 0; }')
  })

  it('links the CV stylesheets so the iframe can style the clone', async () => {
    const html = await capturePrintHtml(populatedDocument())
    expect(html).toContain('href="/cv/fonts.css"')
    expect(html).toContain('href="/cv/base.css"')
  })

  it('switches paper geometry for a Letter document', async () => {
    const html = await capturePrintHtml({ ...populatedDocument(), paper: 'letter' })
    expect(html).toContain('--cv-page-width: 215.9mm')
    expect(html).toContain('@page { size: Letter; margin: 0; }')
  })

  it('renders an English CV with English headings', async () => {
    const html = await capturePrintHtml({ ...populatedDocument(), language: 'en' })
    expect(html).toContain('Work Experience')
    expect(html).toContain('Jan 2022 – Present')
    expect(html).toContain('<html lang="en">')
  })
})
