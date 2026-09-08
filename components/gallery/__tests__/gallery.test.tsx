import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TEMPLATES, getTemplate } from '@/components/cv/templates'
import { TemplateCard } from '@/components/gallery/TemplateCard'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createDemoDocument } from '@/lib/schema/demo'
import messages from '@/messages/no.json'

function demo(): CvDocumentData {
  let counter = 0
  return createDemoDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })
}

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('TemplateCard', () => {
  it('names the template', () => {
    // Taken from the registry rather than hard-coded: display names are
    // branding and change, the behaviour under test does not.
    const template = getTemplate('bergen')
    wrap(<TemplateCard document={demo()} onChoose={vi.fn()} template={template} />)
    expect(screen.getByRole('button', { name: template.name })).toBeInTheDocument()
  })

  it('renders a thumbnail of the CV in that template', () => {
    const { container } = wrap(
      <TemplateCard document={demo()} onChoose={vi.fn()} template={getTemplate('fjord')} />,
    )
    expect(container.querySelector('.cv-doc--fjord')).not.toBeNull()
  })

  it('previews with the template accent and pairing, not the document default', async () => {
    const { getFontPair } = await import('@/lib/theme/fonts')
    const template = getTemplate('akademisk')
    const { container } = wrap(
      <TemplateCard document={demo()} onChoose={vi.fn()} template={template} />,
    )

    const root = container.querySelector('.cv-doc') as HTMLElement
    expect(root.style.getPropertyValue('--cv-accent')).toBe(template.defaultAccent)
    expect(root.style.getPropertyValue('--cv-font-head')).toBe(
      getFontPair(template.defaultFontPairId!).head,
    )
  })

  it('reports the chosen template id', async () => {
    const onChoose = vi.fn()
    const template = getTemplate('studio')
    wrap(<TemplateCard document={demo()} onChoose={onChoose} template={template} />)
    await userEvent.click(screen.getByRole('button', { name: template.name }))
    expect(onChoose).toHaveBeenCalledWith('studio')
  })

  it('hides the thumbnail from assistive technology', () => {
    const { container } = wrap(
      <TemplateCard document={demo()} onChoose={vi.fn()} template={getTemplate('oslo')} />,
    )
    // Otherwise a screen reader would read an entire CV for every card.
    const hidden = container.querySelector('[aria-hidden="true"]')
    expect(hidden?.querySelector('.cv-doc')).not.toBeNull()
  })
})

describe('the gallery set', () => {
  it('offers all nine templates', () => {
    expect(TEMPLATES).toHaveLength(9)
  })

  it('renders one thumbnail per template with no duplicates', () => {
    const { container } = wrap(
      <ul>
        {TEMPLATES.map((template) => (
          <TemplateCard
            document={demo()}
            key={template.id}
            onChoose={vi.fn()}
            template={template}
          />
        ))}
      </ul>,
    )
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(TEMPLATES.length)
  })
})
