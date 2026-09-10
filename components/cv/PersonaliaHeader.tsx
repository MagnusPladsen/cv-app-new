import type { CSSProperties } from 'react'

import type { Personalia } from '@/lib/schema/cv'

/**
 * How much to shrink the name before letting it wrap.
 *
 * The name is the most important thing on a CV, so a long one should get
 * smaller rather than break across lines the moment it stops fitting - which
 * is what happened to "Magnus Pladsen" in a 62mm sidebar. The floor is 0.72:
 * below that it stops reading as the page's title, and wrapping is the better
 * of the two compromises.
 *
 * Character count rather than measurement, because this has to produce the
 * same result on the server, in the preview and in the print iframe, where no
 * layout has happened yet.
 */
export function nameScale(fullName: string): number {
  const length = fullName.length
  if (length <= 18) return 1
  if (length >= 34) return 0.72
  // Linear between the two, rounded so the value is stable in snapshots.
  return Math.round((1 - ((length - 18) / 16) * 0.28) * 100) / 100
}

export function PersonaliaHeader({
  personalia,
  decorative = false,
}: {
  personalia: Personalia
  /** True in a thumbnail, where this CV is an illustration of a template. */
  decorative?: boolean
}) {
  const fullName = [personalia.firstName, personalia.lastName].filter(Boolean).join(' ')
  const place = [personalia.city, personalia.country].filter(Boolean).join(', ')
  const contact = [personalia.email, personalia.phone, place].filter(Boolean).join(' · ')
  const showPhoto = personalia.showPhoto && Boolean(personalia.photo?.dataUrl)
  // A custom property rather than a font-size, so each template's own name
  // rule keeps its size and simply multiplies by this.
  const nameStyle = { '--cv-name-scale': nameScale(fullName) } as CSSProperties

  return (
    <header className="cv-header">
      <div className="cv-header__body">
        {/* An <h1> in the real document, where the CV *is* the page and the
            name is its title. A <p> in a thumbnail: search engines ignore
            aria-hidden, so fourteen template cards otherwise put fourteen
            <h1>Ingrid Bjørnstad Halvorsen</h1> on the templates page and
            invite a crawler to decide the page is about her. */}
        {fullName ? (
          decorative ? (
            <p className="cv-header__name" style={nameStyle}>
              {fullName}
            </p>
          ) : (
            <h1 className="cv-header__name" style={nameStyle}>
              {fullName}
            </h1>
          )
        ) : null}
        {personalia.title ? <p className="cv-header__title">{personalia.title}</p> : null}
        {contact ? <p className="cv-header__contact">{contact}</p> : null}
        {personalia.links.length > 0 ? (
          <p className="cv-links">
            {personalia.links.map((link) => (
              <a className="cv-links__item" key={link.id} href={link.url}>
                {link.label || link.url}
              </a>
            ))}
          </p>
        ) : null}
      </div>
      {showPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element -- the print iframe
           cannot use next/image; the source is always an inline data URL. */
        <img className="cv-header__photo" src={personalia.photo!.dataUrl} alt="" />
      ) : null}
    </header>
  )
}
