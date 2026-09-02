import { describe, expect, it } from 'vitest'
import { getCvLabels } from '@/lib/cv-labels'
import { formatDateRange, formatMonthYear } from '@/lib/cv-labels/format'

const no = getCvLabels('no')
const en = getCvLabels('en')

describe('formatMonthYear', () => {
  it('formats a Norwegian month and year', () => {
    expect(formatMonthYear('2022-01', no)).toBe('jan. 2022')
  })

  it('formats an English month and year', () => {
    expect(formatMonthYear('2022-01', en)).toBe('Jan 2022')
  })

  it('returns an empty string for an empty value', () => {
    expect(formatMonthYear('', no)).toBe('')
  })

  it('falls back to the raw value when the month is out of range', () => {
    expect(formatMonthYear('2022-13', no)).toBe('2022-13')
  })

  it('accepts a bare year', () => {
    expect(formatMonthYear('2022', no)).toBe('2022')
  })
})

describe('formatDateRange', () => {
  it('renders a closed range', () => {
    expect(formatDateRange('2020-08', '2022-06', false, en)).toBe('Aug 2020 – Jun 2022')
  })

  it('renders an ongoing role using the present label', () => {
    expect(formatDateRange('2022-01', '', true, no)).toBe('jan. 2022 – nå')
  })

  it('ignores the end date when current is true', () => {
    expect(formatDateRange('2022-01', '2023-01', true, en)).toBe('Jan 2022 – Present')
  })

  it('renders only the start when there is no end and it is not current', () => {
    expect(formatDateRange('2022-01', '', false, en)).toBe('Jan 2022')
  })

  it('renders nothing when there are no dates', () => {
    expect(formatDateRange('', '', false, en)).toBe('')
  })
})
