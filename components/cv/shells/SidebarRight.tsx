import type { ReactNode } from 'react'

export function SidebarRight({
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
      {header}
      <div className="cv-shell cv-shell--sidebar cv-shell--sidebar-right">
        <div className="cv-shell__main">{sections}</div>
        <aside className="cv-shell__aside">{sidebar}</aside>
      </div>
    </>
  )
}
