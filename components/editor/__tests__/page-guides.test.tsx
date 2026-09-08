import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { PageGuides } from '@/components/editor/PageGuides'
import { mmToPx, usableHeightMm } from '@/lib/print/paper'
import messages from '@/messages/no.json'

function render_(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('PageGuides', () => {
  it('draws nothing for content that fits one page', () => {
    const { container } = render_(<PageGuides contentHeightMm={100} paper="a4" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws one guide for two pages', () => {
    render_(<PageGuides contentHeightMm={usableHeightMm('a4') + 10} paper="a4" />)
    expect(screen.getAllByTestId('page-guide')).toHaveLength(1)
  })

  it('positions the guide at the page boundary, offset by the page margin', () => {
    const margin = 20
    render_(
      <PageGuides
        contentHeightMm={usableHeightMm('a4', margin) + 10}
        marginMm={margin}
        paper="a4"
      />,
    )
    // Offsets are measured from the content box, so the margin is added back.
    expect(screen.getByTestId('page-guide')).toHaveStyle({
      top: `${mmToPx(usableHeightMm('a4', margin)) + mmToPx(margin)}px`,
    })
  })

  it('draws two guides for three pages and labels the page each one starts', () => {
    render_(<PageGuides contentHeightMm={usableHeightMm('a4') * 2 + 10} paper="a4" />)
    expect(screen.getAllByTestId('page-guide')).toHaveLength(2)
    expect(screen.getByText('Side 2')).toBeInTheDocument()
    expect(screen.getByText('Side 3')).toBeInTheDocument()
  })

  it('uses the shorter Letter page', () => {
    const height = usableHeightMm('letter') + 5
    render_(<PageGuides contentHeightMm={height} paper="letter" />)
    expect(screen.getByTestId('page-guide')).toHaveStyle({
      top: `${mmToPx(usableHeightMm('letter'))}px`,
    })
  })

  it('respects a template that tightens the page margin', () => {
    const margin = 14
    render_(
      <PageGuides contentHeightMm={usableHeightMm('a4', margin) + 5} marginMm={margin} paper="a4" />,
    )
    expect(screen.getByTestId('page-guide')).toHaveStyle({
      top: `${mmToPx(usableHeightMm('a4', margin)) + mmToPx(margin)}px`,
    })
  })

  it('is hidden from assistive technology, being purely decorative', () => {
    const { container } = render_(
      <PageGuides contentHeightMm={usableHeightMm('a4') + 10} paper="a4" />,
    )
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
