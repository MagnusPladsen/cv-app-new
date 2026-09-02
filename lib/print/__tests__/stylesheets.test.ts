import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CV_STYLESHEETS } from '@/lib/print/stylesheets'

const publicDir = join(process.cwd(), 'public')

function readPublic(url: string): string {
  return readFileSync(join(publicDir, url), 'utf8')
}

describe('CV_STYLESHEETS', () => {
  it('lists fonts before the base stylesheet', () => {
    expect(CV_STYLESHEETS).toEqual(['/cv/fonts.css', '/cv/base.css'])
  })

  it('points at files that exist in public/', () => {
    for (const url of CV_STYLESHEETS) {
      expect(existsSync(join(publicDir, url)), `${url} is missing`).toBe(true)
    }
  })

  it('never uses @import, which would not resolve inside the print iframe', () => {
    for (const url of CV_STYLESHEETS) {
      expect(readPublic(url)).not.toContain('@import')
    }
  })
})

describe('fonts.css', () => {
  it('declares the Inter face', () => {
    const css = readPublic('/cv/fonts.css')
    expect(css).toContain('@font-face')
    expect(css).toContain("font-family: 'Inter'")
  })

  it('references font files that exist', () => {
    const css = readPublic('/cv/fonts.css')
    const matches = [...css.matchAll(/url\('([^']+)'\)/g)].map((match) => match[1]!)
    expect(matches.length).toBeGreaterThan(0)
    for (const url of matches) {
      expect(existsSync(join(publicDir, url)), `${url} is missing`).toBe(true)
    }
  })
})

describe('base.css', () => {
  const css = readPublic('/cv/base.css')

  it('defines the document surface', () => {
    expect(css).toContain('.cv-doc')
  })

  it('keeps entries and items off page boundaries', () => {
    expect(css).toContain('break-inside: avoid')
  })

  it('keeps a section title attached to its body', () => {
    expect(css).toContain('break-after: avoid')
  })

  it('defines every class the renderers rely on', () => {
    for (const className of [
      '.cv-header',
      '.cv-header__name',
      '.cv-header__title',
      '.cv-header__contact',
      '.cv-header__photo',
      '.cv-links',
      '.cv-section',
      '.cv-section__title',
      '.cv-entry',
      '.cv-entry__head',
      '.cv-entry__dates',
      '.cv-bullets',
      '.cv-prose',
      '.cv-items',
      '.cv-item',
      '.cv-bar',
      '.cv-bar__fill',
      '.cv-inline-list',
    ]) {
      expect(css, `${className} is not defined`).toContain(className)
    }
  })
})
