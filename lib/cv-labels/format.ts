import type { CvLabels } from './types'

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

/** Formats "YYYY-MM" as a localized abbreviated month and year. */
export function formatMonthYear(value: string, labels: CvLabels): string {
  if (!value) return ''

  const match = MONTH_PATTERN.exec(value)
  if (!match) return value

  const [, year, rawMonth] = match
  const monthIndex = Number(rawMonth) - 1
  const month = labels.months[monthIndex]
  if (!month) return value

  return `${month} ${year}`
}

export function formatDateRange(
  from: string,
  to: string,
  current: boolean,
  labels: CvLabels,
): string {
  const start = formatMonthYear(from, labels)
  const end = current ? labels.present : formatMonthYear(to, labels)

  if (start && end) return `${start} – ${end}`
  return start || end
}
