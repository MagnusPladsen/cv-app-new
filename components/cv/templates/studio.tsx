import type { SectionRenderer, Template } from '@/components/cv/types'

/**
 * Studio - the creative one. An oversized name, an asymmetric tinted sidebar
 * and accent-filled section titles.
 *
 * It is the only template that uses the `overrides` hook: its summary is set as
 * a lead paragraph rather than a titled section, which no amount of CSS on the
 * shared renderer could achieve.
 */
const leadSummary: SectionRenderer = ({ section }) => {
  if (section.type !== 'summary') return null
  const text = section.text.trim()
  if (!text) return null

  return (
    <section className="cv-section cv-lead">
      <p className="cv-lead__text">{text}</p>
    </section>
  )
}

export const studio: Template = {
  id: 'studio',
  name: 'Studio',
  shell: 'sidebar-left',
  defaultAccent: '#be123c',
  swatches: ['#be123c', '#4c1d95', '#0f766e', '#c2410c', '#1d4ed8', '#1f2933'],
  levelDisplay: 'bar',
  defaultFontPairId: 'inter-tight',
  sidebarSections: ['skills', 'languages', 'interests'],
  overrides: { summary: leadSummary },
}

/** Exported so a test can assert the override is wired to this renderer. */
export { leadSummary }
