import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CoverLetterDocument } from '@/components/cv/CoverLetterDocument'
import { createEmptyDocument } from '@/lib/schema/defaults'
import type { CoverLetter, CvDocument } from '@/lib/schema/cv'

let counter = 0
const base = () => createEmptyDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })

function withLetter(letter: Partial<CoverLetter>, doc: CvDocument = base()): CvDocument {
  return {
    ...doc,
    personalia: { ...doc.personalia, firstName: 'Ingrid', lastName: 'Halvorsen' },
    coverLetter: {
      enabled: true,
      recipient: 'Nordvest Digital AS',
      position: 'Søknad på stilling som frontendutvikler',
      place: 'Oslo',
      date: '16. september 2026',
      greeting: 'Hei,',
      body: 'Jeg søker stillingen.',
      closing: 'Med vennlig hilsen',
      ...letter,
    },
  }
}

describe('the cover letter', () => {
  it('renders nothing when there is none', () => {
    const { container } = render(<CoverLetterDocument document={base()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when it is switched off', () => {
    const { container } = render(
      <CoverLetterDocument document={withLetter({ enabled: false })} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders even while empty, because that is where you write it', () => {
    const { container } = render(
      <CoverLetterDocument document={withLetter({ body: '', greeting: '', closing: '' })} />,
    )
    expect(container.querySelector('.cv-letter')).not.toBeNull()
  })

  it('is a .cv-doc, so the export picks it up without knowing letters exist', () => {
    const { container } = render(<CoverLetterDocument document={withLetter({})} />)
    const root = container.querySelector('.cv-letter')
    expect(root?.classList.contains('cv-doc')).toBe(true)
  })

  it('wears the same template as the CV, so the pair matches', () => {
    const doc = base()
    doc.theme = { ...doc.theme, templateId: 'fjord' }
    const { container } = render(<CoverLetterDocument document={withLetter({}, doc)} />)
    expect(container.querySelector('.cv-doc--fjord')).not.toBeNull()
  })

  it('takes the page geometry from the document, not from the CV component', () => {
    const doc = { ...base(), paper: 'letter' as const }
    const { container } = render(<CoverLetterDocument document={withLetter({}, doc)} />)
    const root = container.querySelector('.cv-letter') as HTMLElement
    expect(root.style.getPropertyValue('--cv-page-width')).toBe('215.9mm')
  })

  it('signs off with the name from the personalia', () => {
    const { container } = render(<CoverLetterDocument document={withLetter({})} />)
    expect(container.querySelector('.cv-letter__signature')?.textContent).toBe('Ingrid Halvorsen')
  })

  it('puts the name in a heading, unless it is decorative', () => {
    const { container } = render(<CoverLetterDocument document={withLetter({})} />)
    expect(container.querySelector('h1.cv-letter__name')).not.toBeNull()

    const thumb = render(<CoverLetterDocument decorative document={withLetter({})} />)
    // Two h1s on one printed page would be two documents claiming to be the
    // title of the same thing.
    expect(thumb.container.querySelector('h1')).toBeNull()
  })

  it('keeps the writer’s own line breaks in the body', () => {
    const { container } = render(
      <CoverLetterDocument document={withLetter({ body: 'Første.\n\nAndre.' })} />,
    )
    const body = container.querySelector('.cv-letter__body') as HTMLElement
    expect(body.textContent).toContain('Første.')
    expect(body.textContent).toContain('Andre.')
  })
})
