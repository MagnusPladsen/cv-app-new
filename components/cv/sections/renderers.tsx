import type { CvLabels } from '@/lib/cv-labels'
import { formatDateRange, formatMonthYear } from '@/lib/cv-labels/format'
import type { LanguageLevel, Section, SectionType, TimelineEntry } from '@/lib/schema/cv'
import type { RenderContext, SectionRenderer } from '@/components/cv/types'
import { Description } from './Description'
import { LevelBar } from './LevelBar'
import { SectionFrame } from './SectionFrame'

export function sectionTitle(section: Section, labels: CvLabels): string {
  if (section.titleOverride?.trim()) return section.titleOverride.trim()
  if (section.type === 'custom') return section.title
  return labels.sections[section.type]
}

const LANGUAGE_LEVEL_ORDER: LanguageLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native']

function languageFraction(level: LanguageLevel): number {
  return (LANGUAGE_LEVEL_ORDER.indexOf(level) + 1) / LANGUAGE_LEVEL_ORDER.length
}

function TimelineEntryView({
  entry,
  context,
}: {
  entry: TimelineEntry
  context: RenderContext
}) {
  const dates = formatDateRange(entry.from, entry.to, entry.current, context.labels)
  const org = [entry.organisation, entry.location].filter(Boolean).join(' · ')

  return (
    <article className="cv-entry">
      <div className="cv-entry__head">
        <div>
          <div className="cv-entry__role">{entry.role}</div>
          {org ? <div className="cv-entry__org">{org}</div> : null}
        </div>
        {dates ? <div className="cv-entry__dates">{dates}</div> : null}
      </div>
      <Description description={entry.description} mode={entry.descriptionMode} />
    </article>
  )
}

const timelineRenderer: SectionRenderer = ({ section, context }) => {
  if (!('entries' in section) || !section.entries || section.entries.length === 0) return null

  return (
    <SectionFrame title={sectionTitle(section, context.labels)}>
      {(section.entries as TimelineEntry[]).map((entry) => (
        <TimelineEntryView key={entry.id} entry={entry} context={context} />
      ))}
    </SectionFrame>
  )
}

export const SECTION_RENDERERS: Record<SectionType, SectionRenderer> = {
  summary: ({ section, context }) => {
    if (section.type !== 'summary') return null
    const text = section.text.trim()
    if (!text) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <p className="cv-prose">{text}</p>
      </SectionFrame>
    )
  },

  experience: timelineRenderer,
  education: timelineRenderer,
  projects: timelineRenderer,
  volunteering: timelineRenderer,
  courses: timelineRenderer,

  skills: ({ section, context }) => {
    if (section.type !== 'skills' || section.items.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <ul className="cv-items">
          {section.items.map((item) => (
            <li className="cv-item" key={item.id}>
              <span className="cv-item__name">{item.name}</span>
              {item.level ? (
                <LevelBar
                  fraction={item.level / 5}
                  label={context.labels.skillLevels[item.level]}
                  display={context.levelDisplay}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </SectionFrame>
    )
  },

  languages: ({ section, context }) => {
    if (section.type !== 'languages' || section.items.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <ul className="cv-items">
          {section.items.map((item) => (
            <li className="cv-item" key={item.id}>
              <span className="cv-item__name">{item.name}</span>
              {item.level ? (
                <LevelBar
                  fraction={languageFraction(item.level)}
                  label={context.labels.languageLevels[item.level]}
                  display={context.levelDisplay}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </SectionFrame>
    )
  },

  certifications: ({ section, context }) => {
    if (section.type !== 'certifications' || section.entries.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        {section.entries.map((entry) => (
          <article className="cv-entry" key={entry.id}>
            <div className="cv-entry__head">
              <div>
                <div className="cv-entry__role">{entry.name}</div>
                {entry.issuer ? <div className="cv-entry__org">{entry.issuer}</div> : null}
              </div>
              {entry.date ? (
                <div className="cv-entry__dates">
                  {formatMonthYear(entry.date, context.labels)}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </SectionFrame>
    )
  },

  references: ({ section, context }) => {
    if (section.type !== 'references') return null

    if (section.entries.length === 0) {
      return (
        <SectionFrame title={sectionTitle(section, context.labels)}>
          <p className="cv-prose">{context.labels.referencesOnRequest}</p>
        </SectionFrame>
      )
    }

    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        {section.entries.map((entry) => (
          <article className="cv-entry" key={entry.id}>
            <div className="cv-entry__role">{entry.name}</div>
            <div className="cv-entry__org">
              {[entry.role, entry.organisation].filter(Boolean).join(' · ')}
            </div>
            {/* A distinct class: an email is not an organisation name, and
                templates that style organisations (small caps, say) must not
                mangle it. */}
            <div className="cv-entry__contact">
              {[entry.email, entry.phone].filter(Boolean).join(' · ')}
            </div>
          </article>
        ))}
      </SectionFrame>
    )
  },

  interests: ({ section, context }) => {
    if (section.type !== 'interests') return null
    const items = section.items.map((item) => item.trim()).filter(Boolean)
    if (items.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <p className="cv-inline-list">{items.join(' · ')}</p>
      </SectionFrame>
    )
  },

  drivingLicence: ({ section, context }) => {
    if (section.type !== 'drivingLicence') return null
    const classes = section.classes.map((value) => value.trim()).filter(Boolean)
    if (classes.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <p className="cv-inline-list">
          {`${context.labels.drivingLicenceClass} ${classes.join(', ')}`}
        </p>
        {section.note ? <p className="cv-prose">{section.note}</p> : null}
      </SectionFrame>
    )
  },

  custom: ({ section, context }) => {
    if (section.type !== 'custom') return null
    const title = sectionTitle(section, context.labels)

    if (section.shape === 'entries') {
      if (!section.entries || section.entries.length === 0) return null
      return (
        <SectionFrame title={title}>
          {section.entries.map((entry) => (
            <TimelineEntryView key={entry.id} entry={entry} context={context} />
          ))}
        </SectionFrame>
      )
    }

    if (section.shape === 'bullets') {
      const bullets = (section.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean)
      if (bullets.length === 0) return null
      return (
        <SectionFrame title={title}>
          <ul className="cv-bullets">
            {bullets.map((bullet, index) => (
              <li key={`${index}-${bullet}`}>{bullet}</li>
            ))}
          </ul>
        </SectionFrame>
      )
    }

    const text = section.text?.trim()
    if (!text) return null
    return (
      <SectionFrame title={title}>
        <p className="cv-prose">{text}</p>
      </SectionFrame>
    )
  },
}
