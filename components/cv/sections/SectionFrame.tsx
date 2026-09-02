import type { ReactNode } from 'react'

export function SectionFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cv-section">
      <h2 className="cv-section__title">{title}</h2>
      <div className="cv-section__body">{children}</div>
    </section>
  )
}
