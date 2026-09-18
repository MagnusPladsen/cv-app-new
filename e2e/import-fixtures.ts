import { strToU8, zipSync } from 'fflate'

/**
 * CV files built in code for the import tests.
 *
 * Built rather than committed: a real CV cannot go in a public repository,
 * and a fixture nobody can read is a fixture nobody maintains.
 */

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

export function docx(paragraphs: string[]): Buffer {
  const body = paragraphs
    .map((text) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`)
    .join('')
  const zipped = zipSync({
    'word/document.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`,
    ),
  })
  return Buffer.from(zipped)
}

/** A one-page PDF with real text in it, written out by hand. */
export function pdf(lines: { text: string; x: number; y: number; size: number }[]): Buffer {
  const content = lines
    .map(({ text, x, y, size }) => `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${text}) Tj ET`)
    .join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let file = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(file.length)
    file += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const startxref = file.length
  file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) file += `${String(offset).padStart(10, '0')} 00000 n \n`
  file += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`
  return Buffer.from(file, 'latin1')
}

export const CV_PDF = pdf([
  { text: 'Kari Nordmann', x: 60, y: 760, size: 24 },
  { text: 'Prosjektleder', x: 60, y: 735, size: 11 },
  { text: 'kari@example.no', x: 60, y: 715, size: 10 },
  { text: 'Arbeidserfaring', x: 60, y: 660, size: 14 },
  { text: 'Prosjektleder, Veidekke  08.2019 - 06.2023', x: 60, y: 640, size: 11 },
  { text: 'Ledet bygging av ny skole', x: 60, y: 622, size: 10 },
])

export const CV_DOCX = docx([
  'Ola Nordmann',
  'Frontendutvikler',
  'ola@example.no',
  'Arbeidserfaring',
  'Utvikler, Acme  01.2018 - 12.2021',
  'Ferdigheter',
  'TypeScript, React',
])

