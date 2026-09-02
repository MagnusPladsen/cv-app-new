import type { CSSProperties } from 'react'
import type { CvTheme, Density } from '@/lib/schema/cv'
import { pickInk } from './contrast'
import { getFontPair } from './fonts'

export const DENSITY_SCALE: Record<Density, number> = {
  compact: 0.92,
  normal: 1,
  roomy: 1.08,
}

export type ThemeTokenValues = {
  accent: string
  accentInk: string
  ink: string
  muted: string
  rule: string
  surface: string
  scale: number
  fontHead: string
  fontBody: string
}

/** Neutral defaults a template may override. */
export const BASE_TOKENS = {
  ink: '#111111',
  muted: '#5b6472',
  rule: '#d8dde5',
  surface: '#ffffff',
} as const

export type CvThemeStyle = CSSProperties & Record<`--cv-${string}`, string>

export function buildThemeTokens(
  theme: CvTheme,
  overrides: Partial<ThemeTokenValues> = {},
): ThemeTokenValues {
  const fontPair = getFontPair(theme.fontPairId)
  const accent = overrides.accent ?? theme.accent

  return {
    accent,
    accentInk: overrides.accentInk ?? pickInk(accent),
    ink: overrides.ink ?? BASE_TOKENS.ink,
    muted: overrides.muted ?? BASE_TOKENS.muted,
    rule: overrides.rule ?? BASE_TOKENS.rule,
    surface: overrides.surface ?? BASE_TOKENS.surface,
    scale: overrides.scale ?? DENSITY_SCALE[theme.density],
    fontHead: overrides.fontHead ?? fontPair.head,
    fontBody: overrides.fontBody ?? fontPair.body,
  }
}

export function themeTokensToStyle(tokens: ThemeTokenValues): CvThemeStyle {
  return {
    '--cv-accent': tokens.accent,
    '--cv-accent-ink': tokens.accentInk,
    '--cv-ink': tokens.ink,
    '--cv-muted': tokens.muted,
    '--cv-rule': tokens.rule,
    '--cv-surface': tokens.surface,
    '--cv-scale': String(tokens.scale),
    '--cv-font-head': tokens.fontHead,
    '--cv-font-body': tokens.fontBody,
  }
}
