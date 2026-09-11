import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SectionSettings } from '@/components/editor/SectionSettings'
import type { Section } from '@/lib/schema/cv'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

const experience: Section = { id: 's1', type: 'experience', enabled: true, entries: [] }
const custom: Section = {
  id: 's2',
  type: 'custom',
  enabled: true,
  title: 'Publikasjoner',
  shape: 'bullets',
  bullets: [],
}

describe('SectionSettings', () => {
  it('offers the shape picker only for a custom section', () => {
    // Every other section's shape is fixed by its type, so the control would
    // be noise on all thirteen of them.
    wrap(<SectionSettings onShapeChange={vi.fn()} section={experience} />)
    expect(screen.queryByLabelText(messages.sections.shapeLabel)).toBeNull()
  })

  it('lets a custom section change shape', async () => {
    const onShapeChange = vi.fn()
    wrap(<SectionSettings onShapeChange={onShapeChange} section={custom} />)

    await userEvent.selectOptions(
      screen.getByLabelText(messages.sections.shapeLabel),
      messages.sections.shapeText,
    )
    expect(onShapeChange).toHaveBeenCalledWith('s2', 'text')
  })

  it('no longer carries the rename field', () => {
    // It moved to the section list. With every section on screen at once, a
    // full-width "Overskrift på CV-en" card between each one buried the forms
    // it was meant to label.
    wrap(<SectionSettings onShapeChange={vi.fn()} section={custom} />)
    expect(screen.queryByLabelText(messages.sections.renameLabel)).toBeNull()
  })
})
