import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TEMPLATES, getTemplate } from '@/components/cv/templates'
import { TemplateCard } from '@/components/gallery/TemplateCard'
import messages from '@/messages/no.json'

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
    wrap(<TemplateCard onChoose={vi.fn()} template={template} />)
    expect(screen.getByRole('button', { name: template.name })).toBeInTheDocument()
  })

  it('shows that template’s still', () => {
    const { container } = wrap(<TemplateCard onChoose={vi.fn()} template={getTemplate('fjord')} />)
    // next/image rewrites the src to /_next/image?url=... , so read the
    // source it was pointed at rather than the optimiser's URL.
    const src = decodeURIComponent(container.querySelector('img')?.getAttribute('src') ?? '')
    expect(src).toContain('/templates/fjord.png')
  })

  it('reports the chosen template id', async () => {
    const onChoose = vi.fn()
    const template = getTemplate('studio')
    wrap(<TemplateCard onChoose={onChoose} template={template} />)
    await userEvent.click(screen.getByRole('button', { name: template.name }))
    expect(onChoose).toHaveBeenCalledWith('studio')
  })

  it('hides the thumbnail from assistive technology', () => {
    const { container } = wrap(<TemplateCard onChoose={vi.fn()} template={getTemplate('oslo')} />)
    // The button already carries the template's name; a described thumbnail
    // would have a screen reader announce every card twice.
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('')
  })
})

describe('the gallery set', () => {
  it('offers a gallery worth browsing, with no duplicate ids', () => {
    // A floor, not an exact count: the number grows, and a test that has to be
    // edited every time one is added is only testing that someone edited it.
    // Unique ids matter more - a collision would make two templates share a
    // stylesheet and silently overwrite each other in saved CVs.
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(12)
    expect(new Set(TEMPLATES.map((template) => template.id)).size).toBe(TEMPLATES.length)
  })

  it('gives every template a name, an accent and swatches to choose from', () => {
    for (const template of TEMPLATES) {
      expect(template.name.trim(), `${template.id} has no name`).not.toBe('')
      expect(template.defaultAccent, `${template.id} has no accent`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(template.swatches.length, `${template.id} has no swatches`).toBeGreaterThan(2)
      expect(template.tags.length, `${template.id} has no tags`).toBeGreaterThan(0)
    }
  })

  it('has a still on disk for every template', () => {
    // The cards stopped rendering live CVs, so a new template with no capture
    // shows an empty box on the landing page and the gallery. Nothing else
    // would catch that: the src is built from the id and always resolves to a
    // plausible path.
    //
    // This proves a file exists, not that it is current. Re-run
    // `bun run thumbnails` after changing a template, the demo CV, or the
    // paper geometry.
    for (const template of TEMPLATES) {
      const path = join(process.cwd(), 'public/templates', `${template.id}.png`)
      expect(existsSync(path), `no still for ${template.id} - run bun run thumbnails`).toBe(true)
    }
  })

  it('gives every card its own still', () => {
    const { container } = wrap(
      <ul>
        {TEMPLATES.map((template) => (
          <TemplateCard key={template.id} onChoose={vi.fn()} template={template} />
        ))}
      </ul>,
    )
    const sources = [...container.querySelectorAll('img')].map((image) => image.getAttribute('src'))
    expect(sources).toHaveLength(TEMPLATES.length)
    expect(new Set(sources).size).toBe(TEMPLATES.length)
  })
})
