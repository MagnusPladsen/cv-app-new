import { describe, expect, it } from 'vitest'
import type { CvTheme } from '@/lib/schema/cv'
import { DEFAULT_FONT_PAIR_ID, FONT_PAIRS, getFontPair } from '@/lib/theme/fonts'
import { DENSITY_SCALE, buildThemeTokens, themeTokensToStyle } from '@/lib/theme/tokens'

const theme: CvTheme = {
  templateId: 'oslo',
  accent: '#1e3a8a',
  fontPairId: DEFAULT_FONT_PAIR_ID,
  density: 'normal',
}

describe('font registry', () => {
  it('contains the default pair', () => {
    expect(FONT_PAIRS.some((pair) => pair.id === DEFAULT_FONT_PAIR_ID)).toBe(true)
  })

  it('has unique ids', () => {
    const ids = FONT_PAIRS.map((pair) => pair.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to the default pair for an unknown id', () => {
    expect(getFontPair('does-not-exist').id).toBe(DEFAULT_FONT_PAIR_ID)
  })
})

describe('buildThemeTokens', () => {
  it('uses the theme accent', () => {
    expect(buildThemeTokens(theme).accent).toBe('#1e3a8a')
  })

  it('derives readable accent ink', () => {
    expect(buildThemeTokens(theme).accentInk).toBe('#ffffff')
    expect(buildThemeTokens({ ...theme, accent: '#ffe600' }).accentInk).toBe('#111111')
  })

  it('maps density onto a numeric scale', () => {
    expect(buildThemeTokens({ ...theme, density: 'compact' }).scale).toBe(DENSITY_SCALE.compact)
    expect(buildThemeTokens({ ...theme, density: 'roomy' }).scale).toBe(DENSITY_SCALE.roomy)
  })

  it('resolves the font pair into font stacks', () => {
    const tokens = buildThemeTokens(theme)
    expect(tokens.fontBody).toContain('Inter')
  })

  it('lets a template override base tokens', () => {
    const tokens = buildThemeTokens(theme, { ink: '#000000', rule: '#dddddd' })
    expect(tokens.ink).toBe('#000000')
    expect(tokens.rule).toBe('#dddddd')
  })

  it('lets a template override the derived accent ink', () => {
    expect(buildThemeTokens(theme, { accentInk: '#ff0000' }).accentInk).toBe('#ff0000')
  })
})

describe('themeTokensToStyle', () => {
  it('emits cv-prefixed custom properties', () => {
    const style = themeTokensToStyle(buildThemeTokens(theme))
    expect(style['--cv-accent']).toBe('#1e3a8a')
    expect(style['--cv-accent-ink']).toBe('#ffffff')
    expect(style['--cv-scale']).toBe('1')
  })

  it('emits every token', () => {
    const style = themeTokensToStyle(buildThemeTokens(theme))
    expect(Object.keys(style).sort()).toEqual([
      '--cv-accent',
      '--cv-accent-ink',
      '--cv-font-body',
      '--cv-font-head',
      '--cv-ink',
      '--cv-muted',
      '--cv-rule',
      '--cv-scale',
      '--cv-surface',
    ])
  })
})
