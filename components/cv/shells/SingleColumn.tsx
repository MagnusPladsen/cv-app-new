import type { ReactNode } from 'react'

export function SingleColumn({
  header,
  sections,
  sidebar,
}: {
  header: ReactNode
  sections: ReactNode
  /** A single-column template has no aside, so anything routed here follows on. */
  sidebar: ReactNode
}) {
  return (
    <>
      {header}
      {sections}
      {sidebar}
    </>
  )
}
