/**
 * "i dag", "i går", "for 3 dager siden" - how long ago something was touched,
 * in the reader's language.
 *
 * Intl.RelativeTimeFormat does the words; the unit is picked here, because
 * "for 45 dager siden" is a number nobody converts in their head.
 */
export function sinceWords(at: number, locale: string, now = Date.now()): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const seconds = Math.round((at - now) / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)

  if (Math.abs(minutes) < 1) return format.format(0, 'second')
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
  if (Math.abs(hours) < 24) return format.format(hours, 'hour')
  if (Math.abs(days) < 7) return format.format(days, 'day')
  if (Math.abs(days) < 31) return format.format(Math.round(days / 7), 'week')
  if (Math.abs(days) < 365) return format.format(Math.round(days / 30), 'month')
  return format.format(Math.round(days / 365), 'year')
}
