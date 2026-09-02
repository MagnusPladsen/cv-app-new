import type { ReactNode } from 'react'

/**
 * A full-bleed accent band carrying the personalia, then the sections below.
 * The band paints text in --cv-accent-ink, which is why that token is derived
 * from the accent's contrast rather than fixed.
 */
export function HeaderBand({
  header,
  sections,
  sidebar,
}: {
  header: ReactNode
  sections: ReactNode
  sidebar: ReactNode
}) {
  return (
    <>
      <div className="cv-band">{header}</div>
      <div className="cv-shell cv-shell--band">
        {sidebar}
        {sections}
      </div>
    </>
  )
}
