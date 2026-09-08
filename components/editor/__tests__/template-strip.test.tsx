import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TEMPLATES } from '@/components/cv/templates'
import { TemplateStrip } from '@/components/editor/TemplateStrip'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

function fixture(templateId = 'oslo'): CvDocumentData {
  let counter = 0
  const doc = createEmptyDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })
  return { ...doc, theme: { ...doc.theme, templateId } }
}

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('TemplateStrip', () => {
  it('shows every template, so the choice is never hidden', () => {
    wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)
    for (const template of TEMPLATES) {
      expect(screen.getByRole('button', { name: template.name })).toBeInTheDocument()
    }
  })

  it('marks the active template', () => {
    wrap(<TemplateStrip document={fixture('bergen')} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Bergen' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Oslo' })).not.toHaveAttribute('aria-current')
  })

  it('reports a selection', async () => {
    const onSelect = vi.fn()
    wrap(<TemplateStrip document={fixture()} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fjord' }))
    expect(onSelect).toHaveBeenCalledWith('fjord')
  })

  it("previews the user's own CV in each template, not a demo", () => {
    const doc = fixture()
    doc.personalia = { ...doc.personalia, firstName: 'Ola', lastName: 'Nordmann' }
    doc.sections = doc.sections.map((section) =>
      section.type === 'summary' ? { ...section, enabled: true, text: 'Min tekst' } : section,
    )

    const { container } = wrap(<TemplateStrip document={doc} onSelect={vi.fn()} />)
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(TEMPLATES.length)
    expect(container.textContent).toContain('Ola Nordmann')
  })

  it('renders each thumbnail in its own template', () => {
    const { container } = wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)
    for (const template of TEMPLATES) {
      expect(container.querySelector(`.cv-doc--${template.id}`)).not.toBeNull()
    }
  })

  it('links out to the full gallery', () => {
    wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Se alle maler' })).toBeInTheDocument()
  })
})
