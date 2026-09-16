import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '@/components/cv/templates'
import { CV_STYLESHEETS, templateStylesheet } from '@/lib/print/stylesheets'

const publicDir = join(process.cwd(), 'public')

function readPublic(url: string): string {
  return readFileSync(join(publicDir, url), 'utf8')
}

describe('CV_STYLESHEETS', () => {
  it('lists fonts first, then the base rules, then the letter', () => {
    // Order is the cascade. Faces have to be declared before anything asks
    // for them, and letter.css layers on the base rather than replacing them.
    expect(CV_STYLESHEETS).toEqual(['/cv/fonts.css', '/cv/base.css', '/cv/letter.css'])
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

describe('template stylesheets', () => {
  it('resolves a predictable path per template', () => {
    expect(templateStylesheet('oslo')).toBe('/cv/templates/oslo.css')
  })

  it('has a file on disk for every registered template', () => {
    for (const template of TEMPLATES) {
      const url = templateStylesheet(template.id)
      expect(existsSync(join(publicDir, url)), `${url} is missing`).toBe(true)
    }
  })

  it('never uses @import in a template sheet either', () => {
    for (const template of TEMPLATES) {
      expect(readPublic(templateStylesheet(template.id))).not.toContain('@import')
    }
  })
})

describe('class contract additions', () => {
  it('defines the reference contact class the renderers use', () => {
    expect(readPublic('/cv/base.css')).toContain('.cv-entry__contact')
  })
})

describe('font registry and faces agree', () => {
  it('declares a face for every family a pairing names', async () => {
    const { FONT_PAIRS } = await import('@/lib/theme/fonts')
    const css = readPublic('/cv/fonts.css')

    for (const pair of FONT_PAIRS) {
      for (const stack of [pair.head, pair.body]) {
        const family = stack.match(/^'([^']+)'/)?.[1]
        if (!family) continue
        expect(
          css,
          `${family} is used by pairing "${pair.id}" but has no @font-face; it would fall back silently in the PDF`,
        ).toContain(`font-family: '${family}'`)
      }
    }
  })
})

describe('base stylesheet robustness', () => {
  it('sets text alignment explicitly rather than inheriting it', () => {
    // A gallery thumbnail is wrapped in a <button>, which centres its text by
    // default; without this every line of the CV is centred.
    expect(readPublic('/cv/base.css')).toContain('text-align: left')
  })
})

describe('the print page-setup stylesheet', () => {
  it('exists on disk for every paper size', async () => {
    // buildPrintHtml links it by name. A missing file is a 404 inside the
    // print iframe, which shows up as a PDF with the wrong page size and no
    // error anywhere.
    const { readFileSync } = await import('node:fs')
    for (const paper of ['a4', 'letter'] as const) {
      const css = readFileSync(`public/cv/print-${paper}.css`, 'utf8')
      expect(css, `${paper} has no @page rule`).toMatch(/@page\s*\{/)
      expect(css).toMatch(/margin:\s*0/)
    }
  })

  it('names the right paper size in each', async () => {
    const { readFileSync } = await import('node:fs')
    expect(readFileSync('public/cv/print-a4.css', 'utf8')).toMatch(/size:\s*A4/)
    expect(readFileSync('public/cv/print-letter.css', 'utf8')).toMatch(/size:\s*Letter/)
  })
})
