import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CvDocument } from '@/components/cv/CvDocument'
import { buildPrintTitle } from '@/lib/print/print-title'
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

/**
 * Captures what the print pipeline actually puts on paper: the copy it places
 * in [data-print-root], read at the moment print() is called.
 */
async function capturePrintHtml(doc: CvDocumentData): Promise<string> {
  const { container } = render(<CvDocument document={doc} />)
  const node = container.querySelector<HTMLElement>('.cv-doc')
  expect(node).not.toBeNull()

  let captured = ''
  let titleAtPrint = ''
  await printCvNode(
    {
      nodes: [node!],
      title: buildPrintTitle(doc.personalia.firstName, doc.personalia.lastName),
      paper: doc.paper,
      lang: doc.language,
    },
    {
      waitForFonts: async () => {},
      invokePrint: () => {
        // The last one: cleanup runs on a later tick, so an earlier test's
        // root can still be in the document and querySelector finds the
        // oldest match.
        const roots = document.querySelectorAll('[data-print-root]')
        captured = roots[roots.length - 1]?.innerHTML ?? ''
        // The title is the suggested filename, so it has to be in place while
        // the dialog is open - not restored before it.
        titleAtPrint = document.title
        const link = document.querySelector('link[href^="/cv/print-"]')
        captured += link?.outerHTML ?? ''
      },
      cleanupDelayMs: 0,
    },
  )

  expect(titleAtPrint).toContain('CV')
  // Printing is finished as far as this test is concerned, so let the page
  // clean itself up rather than leaving a root behind for the next one.
  window.dispatchEvent(new Event('afterprint'))
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
    expect(html).toContain('href="/cv/print-a4.css"')
  })

  it('relies on stylesheets the app already has, for every template', async () => {
    // The print path no longer links anything but the page setup: it prints
    // this document, which loads the CV sheets and every template's sheet in
    // the layout. If that ever stops being true, a PDF loses its template's
    // rules while the preview beside it still looks right.
    const { readFileSync } = await import('node:fs')
    const layout = readFileSync('app/[locale]/layout.tsx', 'utf8')
    expect(layout).toContain('CV_STYLESHEETS')
    expect(layout).toContain('ALL_TEMPLATE_STYLESHEETS')
  })

  it('switches paper geometry for a Letter document', async () => {
    const html = await capturePrintHtml({ ...populatedDocument(), paper: 'letter' })
    expect(html).toContain('--cv-page-width: 215.9mm')
    expect(html).toContain('href="/cv/print-letter.css"')
  })

  it('renders an English CV with English headings', async () => {
    const html = await capturePrintHtml({ ...populatedDocument(), language: 'en' })
    expect(html).toContain('Work Experience')
    expect(html).toContain('Jan 2022 – Present')
    // The language rides on the copy now: there is no document of its own to
    // put it on, and hyphenation follows the element.
    expect(html).toContain('lang="en"')
  })
})
