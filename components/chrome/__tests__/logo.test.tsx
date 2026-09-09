import { readFileSync } from 'node:fs'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Logo } from '@/components/chrome/Logo'

/** The `d` attribute of every path, in order. */
function paths(markup: string): string[] {
  return [...markup.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]!)
}

describe('the CVApp mark', () => {
  it('draws the same shape as the favicon', () => {
    // A logo on the page that has drifted from the icon in the tab is the
    // kind of inconsistency nobody notices in review and everybody sees.
    const { container } = render(<Logo />)
    const icon = readFileSync('app/icon.svg', 'utf8')

    expect(paths(container.innerHTML)).toEqual(paths(icon))
  })

  it('shares the same corner radius and viewBox', () => {
    const { container } = render(<Logo />)
    const icon = readFileSync('app/icon.svg', 'utf8')

    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 64 64')
    expect(icon).toContain('viewBox="0 0 64 64"')
    expect(container.querySelector('rect')?.getAttribute('rx')).toBe('13')
    expect(icon).toContain('rx="13"')
  })

  it('is hidden from assistive technology, since the wordmark beside it says the name', () => {
    const { container } = render(<Logo />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})
