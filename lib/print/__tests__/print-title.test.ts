import { describe, expect, it } from 'vitest'
import { buildPrintTitle } from '@/lib/print/print-title'

const base = {
  bodyHtml: '<div class="cv-doc">hei</div>',
  title: 'Ola_Nordmann_CV',
  paper: 'a4' as const,
  lang: 'no',
}

describe('buildPrintTitle', () => {
  it('joins the name and appends CV', () => {
    expect(buildPrintTitle('Ola', 'Nordmann')).toBe('Ola_Nordmann_CV')
  })

  it('transliterates Norwegian letters so every filesystem is happy', () => {
    expect(buildPrintTitle('Bjørn', 'Ærlig Åsen')).toBe('Bjorn_AErlig_Asen_CV')
  })

  it('strips characters that are unsafe in a filename', () => {
    expect(buildPrintTitle('Ola/..', 'Nordmann?')).toBe('Ola_Nordmann_CV')
  })

  it('falls back to CV when there is no name', () => {
    expect(buildPrintTitle('', '   ')).toBe('CV')
  })
})
