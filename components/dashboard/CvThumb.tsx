import { getTemplate } from '@/components/cv/templates'
import type { CvDocument } from '@/lib/schema/cv'

/**
 * A little drawing of the CV, not a rendering of it.
 *
 * A real miniature would be the document itself at 12% - about eight hundred
 * DOM nodes per card, which is the cost that took live CVs off the landing
 * page and the gallery (see CLAUDE.md). A template still would be wrong the
 * other way: every CV in the same template would look identical, and telling
 * two of somebody's CVs apart is the whole job of this list.
 *
 * So: the page, the template's accent, the person's initials, and a rule per
 * switched-on section. Twelve nodes, and it changes when the CV does.
 */
export function CvThumb({ document }: { document: CvDocument }) {
  const template = getTemplate(document.theme.templateId)
  const accent = document.theme.accent || template.defaultAccent
  const sections = document.sections.filter((section) => section.enabled)
  const initials =
    [document.personalia.firstName, document.personalia.lastName]
      .filter(Boolean)
      .map((part) => part.trim()[0]?.toUpperCase() ?? '')
      .join('') || '–'

  // A sidebar template is drawn with one; the rest get a rule under the name.
  const sidebar = template.tags.includes('creative') || template.tags.includes('modern')

  return (
    <span
      aria-hidden="true"
      className="relative flex aspect-[210/297] w-14 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-border sm:w-16"
    >
      {sidebar ? (
        <span className="h-full w-[28%] shrink-0" style={{ background: accent }} />
      ) : null}

      <span className="flex min-w-0 flex-1 flex-col gap-[7%] p-[9%]">
        <span
          className="text-[0.38rem] leading-none font-bold tracking-tight"
          style={{ color: accent }}
        >
          {initials}
        </span>
        {!sidebar ? (
          <span className="h-[2%] w-1/2 rounded-full" style={{ background: accent }} />
        ) : null}
        {/* One rule per section, so a full CV looks full and a new one does
            not pretend to be. */}
        {sections.slice(0, 7).map((section, index) => (
          <span
            className="h-[2.5%] rounded-full bg-foreground/15"
            key={section.id}
            style={{ width: `${88 - (index % 3) * 18}%` }}
          />
        ))}
      </span>
    </span>
  )
}
