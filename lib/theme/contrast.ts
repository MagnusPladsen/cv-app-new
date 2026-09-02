export type Rgb = { r: number; g: number; b: number }

const SHORT_HEX = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i
const LONG_HEX = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

export function parseHex(hex: string): Rgb | null {
  const short = SHORT_HEX.exec(hex)
  if (short) {
    const [, r, g, b] = short
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    }
  }

  const long = LONG_HEX.exec(hex)
  if (long) {
    const [, r, g, b] = long
    return {
      r: Number.parseInt(r!, 16),
      g: Number.parseInt(g!, 16),
      b: Number.parseInt(b!, 16),
    }
  }

  return null
}

function channelToLinear(value: number): number {
  const channel = value / 255
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.1 relative luminance. Unparseable colours are treated as black. */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0

  return (
    0.2126 * channelToLinear(rgb.r) +
    0.7152 * channelToLinear(rgb.g) +
    0.0722 * channelToLinear(rgb.b)
  )
}

/** WCAG 2.1 contrast ratio, between 1 and 21. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Picks whichever ink colour is more readable on `accent`.
 * This is what stops a pale user-picked accent from producing an
 * invisible header in the exported PDF.
 */
export function pickInk(
  accent: string,
  options: { light?: string; dark?: string } = {},
): string {
  const light = options.light ?? '#ffffff'
  const dark = options.dark ?? '#111111'
  return contrastRatio(accent, dark) >= contrastRatio(accent, light) ? dark : light
}
