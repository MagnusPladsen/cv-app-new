import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

/**
 * The palette lives in CSS, so nothing else can assert it. These are the few
 * properties that would be silently wrong if someone edited the token block.
 */
describe('app palette', () => {
  it('defines the brand teal and the warm sand ground', () => {
    expect(css).toContain('--brand: #0f766e')
    expect(css).toContain('--sand: #faf7f2')
  })

  it('paints the ambient page glow and its texture on the body', () => {
    expect(css).toContain('--page-glow')
    expect(css).toContain('--page-pattern')
    expect(css).toContain('background-image: var(--page-pattern), var(--page-glow)')
  })

  it('anchors the glow to the viewport but lets the texture scroll', () => {
    // A fixed texture slides under the content and reads as a rendering
    // fault; a repeating glow tiles down a long editor page. The lists line
    // up with the three background layers in order.
    expect(css).toContain('background-repeat: repeat, no-repeat, no-repeat')
    expect(css).toContain('background-attachment: scroll, fixed, fixed')
  })


  it('gives dark mode its own glow, since the light one would be wrong there', () => {
    const dark = css.slice(css.indexOf('.dark {'))
    expect(dark).toContain('--page-glow')
    expect(dark).toContain('rgba(45, 212, 191')
  })

  it('never defines the CV surface: the paper is white and owned by base.css', () => {
    // Matches a definition, not a mention: the token block carries a comment
    // explaining exactly why --cv-surface does not belong here.
    expect(css).not.toMatch(/^\s*--cv-surface\s*:/m)
  })
})
