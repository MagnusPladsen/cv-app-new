import type { ReactNode } from 'react'

export function SingleColumn({
  header,
  sections,
}: {
  header: ReactNode
  sections: ReactNode
}) {
  return (
    <>
      {header}
      {sections}
    </>
  )
}
