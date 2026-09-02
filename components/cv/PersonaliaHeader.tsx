import type { Personalia } from '@/lib/schema/cv'

export function PersonaliaHeader({ personalia }: { personalia: Personalia }) {
  const fullName = [personalia.firstName, personalia.lastName].filter(Boolean).join(' ')
  const place = [personalia.city, personalia.country].filter(Boolean).join(', ')
  const contact = [personalia.email, personalia.phone, place].filter(Boolean).join(' · ')
  const showPhoto = personalia.showPhoto && Boolean(personalia.photo?.dataUrl)

  return (
    <header className="cv-header">
      <div className="cv-header__body">
        {fullName ? <h1 className="cv-header__name">{fullName}</h1> : null}
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
