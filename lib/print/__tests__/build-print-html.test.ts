import { describe, expect, it } from 'vitest'
import { buildPrintHtml, buildPrintTitle } from '@/lib/print/build-print-html'
import { CV_STYLESHEETS } from '@/lib/print/stylesheets'

const base = {
  bodyHtml: '<div class="cv-doc">hei</div>',
  title: 'Ola_Nordmann_CV',
  paper: 'a4' as const,
  lang: 'no',
}

describe('buildPrintTitle', () => {
  it('joins the name and appends CV', () => {
    expect(buildPrintTitle('Ola', 'Nordmann')).toBe('Ola_Nordmann_CV')
  })

  it('transliterates Norwegian letters so every filesystem is happy', () => {
    expect(buildPrintTitle('Bjørn', 'Ærlig Åsen')).toBe('Bjorn_AErlig_Asen_CV')
  })

  it('strips characters that are unsafe in a filename', () => {
    expect(buildPrintTitle('Ola/..', 'Nordmann?')).toBe('Ola_Nordmann_CV')
  })

  it('falls back to CV when there is no name', () => {
    expect(buildPrintTitle('', '   ')).toBe('CV')
  })
})

describe('buildPrintHtml', () => {
  it('produces a complete document', () => {
    const html = buildPrintHtml(base)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('</html>')
  })

  it('sets the document language', () => {
    expect(buildPrintHtml({ ...base, lang: 'en' })).toContain('<html lang="en">')
  })

  it('links the page setup for the paper, rather than inlining it', () => {
    // This was a <style> block carrying @page. Production's CSP is
    // `style-src 'self'`, so the browser dropped it and every exported PDF
    // came out with the browser's default page size and margins - in
    // production only, and with nothing a user could see going wrong.
    expect(buildPrintHtml(base)).toContain('href="/cv/print-a4.css"')
    expect(buildPrintHtml({ ...base, paper: 'letter' })).toContain('href="/cv/print-letter.css"')
  })

  it('contains no inline style or script at all', () => {
    // The rule that keeps the above from coming back: anything inline here is
    // subject to a CSP that only bites in production.
    const html = buildPrintHtml({ ...base, extraStylesheets: ['/cv/templates/oslo.css'] })
    expect(html).not.toMatch(/<style[\s>]/)
    expect(html).not.toMatch(/<script[\s>]/)
    expect(html).not.toMatch(/\sstyle="/)
  })

  it('puts the page setup last, so it wins on margins', () => {
    const html = buildPrintHtml({ ...base, extraStylesheets: ['/cv/templates/oslo.css'] })
    expect(html.indexOf('/cv/print-a4.css')).toBeGreaterThan(html.indexOf('/cv/templates/oslo.css'))
  })

  it('links the shared CV stylesheets in order', () => {
    const html = buildPrintHtml(base)
    const positions = CV_STYLESHEETS.map((href) => html.indexOf(`href="${href}"`))
    expect(positions.every((position) => position > -1)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('embeds the body markup verbatim', () => {
    expect(buildPrintHtml(base)).toContain('<div class="cv-doc">hei</div>')
  })

  it('escapes the title so a name cannot inject markup', () => {
    const html = buildPrintHtml({ ...base, title: 'a<script>b' })
    expect(html).toContain('<title>a&lt;script&gt;b</title>')
    expect(html).not.toContain('<title>a<script>')
  })

  it('accepts extra stylesheets after the shared ones', () => {
    const html = buildPrintHtml({ ...base, extraStylesheets: ['/cv/templates/oslo.css'] })
    expect(html.indexOf('/cv/templates/oslo.css')).toBeGreaterThan(html.indexOf('/cv/base.css'))
  })
})
