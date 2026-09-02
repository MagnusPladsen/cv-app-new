import type { ReactNode } from 'react'

export function SidebarLeft({
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
      <div className="cv-shell cv-shell--sidebar">
        <aside className="cv-shell__aside">{sidebar}</aside>
        <div className="cv-shell__main">{sections}</div>
      </div>
    </>
  )
}
