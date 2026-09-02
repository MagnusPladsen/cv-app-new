/** Splits a textarea value into bullets, dropping blank lines. */
export function toBullets(description: string): string[] {
  return description
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function Description({
  description,
  mode,
}: {
  description: string | undefined
  mode: 'bullets' | 'prose'
}) {
  const value = description?.trim()
  if (!value) return null

  if (mode === 'prose') {
    return <p className="cv-prose">{value}</p>
  }

  const bullets = toBullets(value)
  if (bullets.length === 0) return null

  return (
    <ul className="cv-bullets">
      {bullets.map((bullet, index) => (
        <li key={`${index}-${bullet}`}>{bullet}</li>
      ))}
    </ul>
  )
}
