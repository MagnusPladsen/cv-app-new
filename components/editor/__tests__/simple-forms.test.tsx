import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SectionEditor } from '@/components/editor/SectionEditor'
import { getCvLabels } from '@/lib/cv-labels'
import type { Section } from '@/lib/schema/cv'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function handlers() {
  return {
    onSummaryChange: vi.fn(),
    onStringListChange: vi.fn(),
    onCustomTextChange: vi.fn(),
    onAddEntry: vi.fn(),
    onUpdateEntry: vi.fn(),
    onRemoveEntry: vi.fn(),
    onMoveEntry: vi.fn(),
    onAddItem: vi.fn(),
    onUpdateItem: vi.fn(),
    onRemoveItem: vi.fn(),
  }
}

function draw(section: Section, h = handlers()) {
  wrap(<SectionEditor section={section} labels={getCvLabels('no')} handlers={h} />)
  return h
}

/**
 * A stateful host, because these forms are controlled: without feeding the new
 * value back, every keystroke would be applied to the original string.
 */
function Live({
  initial,
  onValues,
}: {
  initial: Section
  onValues: (values: string[]) => void
}) {
  const [section, setSection] = useState(initial)
  return (
    <SectionEditor
      section={section}
      labels={getCvLabels('no')}
      handlers={{
        ...handlers(),
        onStringListChange: (_id: string, values: string[]) => {
          onValues(values)
          setSection((current) =>
            current.type === 'interests'
              ? { ...current, items: values }
              : current.type === 'custom'
                ? { ...current, bullets: values }
                : current,
          )
        },
      }}
    />
  )
}

describe('summary form', () => {
  const section: Section = { id: 's', type: 'summary', enabled: true, text: 'Hei' }

  it('shows the current text', () => {
    draw(section)
    expect(screen.getByLabelText('Om meg')).toHaveValue('Hei')
  })

  it('reports edits', async () => {
    const h = draw(section)
    await userEvent.type(screen.getByLabelText('Om meg'), '!')
    expect(h.onSummaryChange).toHaveBeenCalledWith('s', 'Hei!')
  })
})

describe('interests form', () => {
  const section: Section = {
    id: 's',
    type: 'interests',
    enabled: true,
    items: ['Klatring', 'Fotografi'],
  }

  it('renders one line per value', () => {
    draw(section)
    expect(screen.getByLabelText('Interesser')).toHaveValue('Klatring\nFotografi')
  })

  it('lets the user type a multi-line list, keeping blank lines while editing', async () => {
    const onValues = vi.fn()
    wrap(<Live initial={section} onValues={onValues} />)

    const field = screen.getByLabelText('Interesser')
    await userEvent.clear(field)
    await userEvent.type(field, 'Klatring{Enter}{Enter}Sykling')

    expect(onValues).toHaveBeenLastCalledWith(['Klatring', '', 'Sykling'])
  })

  it('leaves blank lines for the renderer to drop', () => {
    const h = draw({ ...section, items: ['Klatring', '', 'Sykling'] })
    expect(screen.getByLabelText('Interesser')).toHaveValue('Klatring\n\nSykling')
    expect(h.onStringListChange).not.toHaveBeenCalled()
  })
})

describe('driving licence form', () => {
  it('edits the classes as a list', () => {
    draw({ id: 's', type: 'drivingLicence', enabled: true, classes: ['B'] })
    expect(screen.getByLabelText('Førerkort')).toHaveValue('B')
  })
})

describe('custom sections', () => {
  it('edits a text-shaped custom section', async () => {
    const h = draw({
      id: 's',
      type: 'custom',
      enabled: true,
      title: 'Notat',
      shape: 'text',
      text: 'Hei',
    })
    await userEvent.type(screen.getByLabelText('Notat'), '!')
    expect(h.onCustomTextChange).toHaveBeenCalledWith('s', 'Hei!')
  })

  it('edits a bullets-shaped custom section as a list', async () => {
    const onValues = vi.fn()
    wrap(
      <Live
        initial={{
          id: 's',
          type: 'custom',
          enabled: true,
          title: 'Publikasjoner',
          shape: 'bullets',
          bullets: ['En artikkel'],
        }}
        onValues={onValues}
      />,
    )
    await userEvent.type(screen.getByLabelText('Publikasjoner'), '{Enter}En til')
    expect(onValues).toHaveBeenLastCalledWith(['En artikkel', 'En til'])
  })

  it('renders nothing for a section type with no form yet', () => {
    const { container } = render(
      <NextIntlClientProvider locale="no" messages={messages}>
        <SectionEditor
          section={{ id: 's', type: 'certifications', enabled: true, entries: [] }}
          labels={getCvLabels('no')}
          handlers={handlers()}
        />
      </NextIntlClientProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
