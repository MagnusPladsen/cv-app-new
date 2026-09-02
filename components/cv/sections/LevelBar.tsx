import type { LevelDisplay } from '@/components/cv/types'

export function LevelBar({
  fraction,
  label,
  display,
}: {
  /** 0-1. */
  fraction: number
  label: string
  display: LevelDisplay
}) {
  if (display === 'text') {
    return <span className="cv-item__level">{label}</span>
  }

  const width = `${Math.round(Math.min(Math.max(fraction, 0), 1) * 100)}%`

  return (
    <span className="cv-bar" role="img" aria-label={label}>
      <span className="cv-bar__fill" style={{ width }} />
    </span>
  )
}
