import type { ReactNode } from 'react'

/**
 * A full-bleed coloured column running the whole height of the page, carrying
 * the personalia as well as the short-form sections.
 *
 * The distinction from SidebarLeft matters: there the aside is a tinted card
 * that stops where its content stops, which looks unfinished on a page with a
 * long main column. Here the colour reaches all three paper edges.
 */
export function SidebarFull({
  header,
  sections,
  sidebar,
}: {
  header: ReactNode
  sections: ReactNode
  sidebar: ReactNode
}) {
  return (
    <div className="cv-shell cv-shell--full">
      <aside className="cv-shell__aside">
        {header}
        {sidebar}
      </aside>
      <div className="cv-shell__main">{sections}</div>
    </div>
  )
}
