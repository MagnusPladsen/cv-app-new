import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { docxToLines } from '@/lib/import/docx-lines'
import { parseCv } from '@/lib/import/parse-cv'

/**
 * Word documents built by hand: a zip holding the few XML parts the reader
 * looks at. Real files carry far more, all of it ignored.
 */

const NS = [
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
].join(' ')

const STYLES = `<?xml version="1.0" encoding="UTF-8"?>
<w:styles ${NS}>
  <w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:styleId="Title"><w:rPr><w:sz w:val="56"/></w:rPr></w:style>
  <w:style w:styleId="Heading1"><w:rPr><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:styleId="Heading2"><w:basedOn w:val="Heading1"/></w:style>
</w:styles>`

const run = (text: string, properties = '') =>
  `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ''}<w:t xml:space="preserve">${text}</w:t></w:r>`

const paragraph = (content: string, properties = '') =>
  `<w:p>${properties ? `<w:pPr>${properties}</w:pPr>` : ''}${content}</w:p>`

const styled = (style: string, text: string) =>
  paragraph(run(text), `<w:pStyle w:val="${style}"/>`)

const bullet = (text: string) =>
  paragraph(run(text), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')

function docx(body: string, parts: Record<string, string> = {}): ArrayBuffer {
  const zipped = zipSync({
    'word/document.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}</w:body></w:document>`,
    ),
    'word/styles.xml': strToU8(STYLES),
    ...Object.fromEntries(Object.entries(parts).map(([name, xml]) => [name, strToU8(xml)])),
  })
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer
}

const texts = (file: ArrayBuffer) => {
  const result = docxToLines(file)
  if (!result.ok) throw new Error(result.reason)
  return result.lines
}

describe('reading a Word document', () => {
  it('reads paragraphs in order, with the size their style gives them', () => {
    const lines = texts(
      docx(styled('Title', 'Kari Nordmann') + paragraph(run('Prosjektleder')) + styled('Heading2', 'Om meg')),
    )
    expect(lines).toEqual([
      { text: 'Kari Nordmann', size: 28 },
      { text: 'Prosjektleder', size: 11 },
      // Heading2 has no size of its own and inherits Heading1's.
      { text: 'Om meg', size: 16 },
    ])
  })

  it('lets a run’s own size win over its style', () => {
    const lines = texts(docx(paragraph(run('Stor', '<w:sz w:val="40"/>') + run(' og liten'))))
    expect(lines).toEqual([{ text: 'Stor og liten', size: 20 }])
  })

  it('puts back the bullet that Word keeps as numbering', () => {
    expect(texts(docx(bullet('Ledet et team på fire')))[0]?.text).toBe('• Ledet et team på fire')
  })

  it('treats a tab as a separator, and a line break as a new line', () => {
    const lines = texts(
      docx(
        paragraph(`${run('Prosjektleder')}<w:r><w:tab/></w:r>${run('08.2019 – nå')}`) +
          paragraph(`${run('Veidekke')}<w:r><w:br/></w:r>${run('Bergen')}`),
      ),
    )
    expect(lines.map((line) => line.text)).toEqual(['Prosjektleder · 08.2019 – nå', 'Veidekke', 'Bergen'])
  })

  it('joins a table row of single lines, and reads a fuller row cell by cell', () => {
    const cell = (content: string) => `<w:tc>${content}</w:tc>`
    const lines = texts(
      docx(
        `<w:tbl>
          <w:tr>${cell(paragraph(run('Utvikler, Acme')))}${cell(paragraph(run('2019 – 2023')))}</w:tr>
          <w:tr>${cell(paragraph(run('Ferdigheter')))}${cell(paragraph(run('TypeScript')) + paragraph(run('React')))}</w:tr>
        </w:tbl>`,
      ),
    )
    expect(lines.map((line) => line.text)).toEqual([
      'Utvikler, Acme · 2019 – 2023',
      'Ferdigheter',
      'TypeScript',
      'React',
    ])
  })

  it('reads a text box once, after the paragraph it is anchored in', () => {
    const box = (text: string) => `<w:txbxContent>${paragraph(run(text))}</w:txbxContent>`
    const lines = texts(
      docx(
        paragraph(
          `${run('Anker')}<w:r><mc:AlternateContent><mc:Choice>${box('I boksen')}</mc:Choice><mc:Fallback>${box('I boksen')}</mc:Fallback></mc:AlternateContent></w:r>`,
        ) + paragraph(run('Etter')),
      ),
    )
    expect(lines.map((line) => line.text)).toEqual(['Anker', 'I boksen', 'Etter'])
  })

  it('leaves out tracked deletions and field codes', () => {
    const lines = texts(
      docx(
        paragraph(
          `${run('Behold')}<w:del><w:r><w:delText>slettet</w:delText></w:r></w:del><w:r><w:instrText>PAGE</w:instrText></w:r>`,
        ),
      ),
    )
    expect(lines.map((line) => line.text)).toEqual(['Behold'])
  })

  it('reads the page header first, where templates put the name', () => {
    const header = `<?xml version="1.0"?><w:hdr ${NS}>${styled('Title', 'Kari Nordmann')}</w:hdr>`
    const lines = texts(
      docx(paragraph(run('Om meg')), {
        'word/header1.xml': header,
        'word/header2.xml': header,
      }),
    )
    expect(lines.map((line) => line.text)).toEqual(['Kari Nordmann', 'Om meg'])
  })
})

describe('Word documents it cannot use', () => {
  it('says so for a file that is not a zip at all', () => {
    expect(docxToLines(strToU8('%PDF-1.7').buffer as ArrayBuffer)).toEqual({
      ok: false,
      reason: 'unreadable',
    })
  })

  it('says so for a zip that is not a Word document', () => {
    const zipped = zipSync({ 'hello.txt': strToU8('hei') })
    expect(docxToLines(zipped.buffer as ArrayBuffer)).toEqual({ ok: false, reason: 'unreadable' })
  })

  it('reports an empty document as having no text', () => {
    expect(docxToLines(docx(paragraph('')))).toEqual({ ok: false, reason: 'no-text' })
  })
})

describe('a Word CV, end to end', () => {
  it('comes out as a CV with its jobs', () => {
    const lines = texts(
      docx(
        [
          styled('Title', 'Kari Nordmann'),
          paragraph(run('Prosjektleder')),
          paragraph(`${run('kari@example.no')}<w:r><w:tab/></w:r>${run('+47 912 34 567')}`),
          styled('Heading1', 'Arbeidserfaring'),
          paragraph(`${run('Prosjektleder', '<w:b/>')}<w:r><w:tab/></w:r>${run('08.2019 – nå')}`),
          paragraph(run('Veidekke ASA')),
          bullet('Ledet bygging av ny skole'),
          bullet('Levert tre måneder før frist'),
          paragraph(`${run('Byggeleder', '<w:b/>')}<w:r><w:tab/></w:r>${run('01.2014 – 07.2019')}`),
          paragraph(run('Skanska')),
          bullet('Ansvar for HMS'),
          styled('Heading1', 'Språk'),
          paragraph(run('Norsk, Engelsk')),
        ].join(''),
      ),
    )

    const parsed = parseCv(lines)
    expect(parsed.personalia).toMatchObject({
      firstName: 'Kari',
      lastName: 'Nordmann',
      title: 'Prosjektleder',
      email: 'kari@example.no',
      phone: '+47 912 34 567',
    })
    expect(parsed.experience).toEqual([
      {
        role: 'Prosjektleder',
        organisation: 'Veidekke ASA',
        from: '2019-08',
        to: '',
        current: true,
        bullets: ['Ledet bygging av ny skole', 'Levert tre måneder før frist'],
      },
      {
        role: 'Byggeleder',
        organisation: 'Skanska',
        from: '2014-01',
        to: '2019-07',
        current: false,
        bullets: ['Ansvar for HMS'],
      },
    ])
    expect(parsed.languages).toEqual(['Norsk', 'Engelsk'])
  })
})
