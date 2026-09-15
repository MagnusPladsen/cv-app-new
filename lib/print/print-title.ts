const TRANSLITERATIONS: Record<string, string> = {
  æ: 'ae',
  Æ: 'AE',
  ø: 'o',
  Ø: 'O',
  å: 'a',
  Å: 'A',
}

/**
 * Builds the filename the browser suggests in the print dialog.
 * Norwegian letters are transliterated so the name survives every filesystem.
 */
export function buildPrintTitle(firstName: string, lastName: string): string {
  const raw = `${firstName} ${lastName}`
    .replace(/[æÆøØåÅ]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return raw ? `${raw}_CV` : 'CV'
}
