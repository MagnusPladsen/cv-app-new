import type { CvDocument } from '@/lib/schema/cv'

/**
 * What to call a CV the user has not named.
 *
 * Derived rather than stored. A name baked in at creation would be the date
 * and nothing else — the personalia is empty at that moment — and it would
 * still say that after the person had typed their name in. Deriving it means
 * the card starts as a date and becomes "Ola Nordmann · 15.09.2026" as soon as
 * there is a name to use.
 *
 * An explicit name always wins: `document.name` is only empty while nobody has
 * set one, and renaming is how you opt out of this entirely.
 *
 * The date is when the CV was made, not when it was last touched. A name that
 * changed every time you edited would be no use for telling two CVs apart,
 * which is the whole job here.
 */
export function cvDisplayName(document: CvDocument, locale: string): string {
  if (document.name.trim()) return document.name.trim()

  const fullName = [document.personalia.firstName, document.personalia.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')

  // createdAt is optional: documents saved before it existed fall back to the
  // only timestamp they have.
  const date = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(document.createdAt ?? document.updatedAt))

  return fullName ? `${fullName} · ${date}` : `CV · ${date}`
}
