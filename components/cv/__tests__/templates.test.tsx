import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CvDocument } from '@/components/cv/CvDocument'
import { TEMPLATES, getTemplate } from '@/components/cv/templates'
import { SIDEBAR_SAFE_SECTIONS } from '@/components/cv/types'
import { SECTION_TYPES, type CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createDemoDocument } from '@/lib/schema/demo'
import { contrastRatio } from '@/lib/theme/contrast'

function demoIn(templateId: string): CvDocumentData {
  let counter = 0
  const doc = createDemoDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })
  const template = getTemplate(templateId)
  return { ...doc, theme: { ...doc.theme, templateId, accent: template.defaultAccent } }
}

describe.each(TEMPLATES.map((template) => [template.id, template] as const))(
  'template %s',
  (id, template) => {
    it('offers its default accent as a swatch', () => {
      expect(template.swatches.map((s) => s.toLowerCase())).toContain(
        template.defaultAccent.toLowerCase(),
      )
    })

    it('names only real section types in its sidebar', () => {
      for (const type of template.sidebarSections ?? []) {
        expect(SECTION_TYPES).toContain(type)
      }
    })

    it('keeps long-form sections out of the narrow sidebar', () => {
      for (const type of template.sidebarSections ?? []) {
        expect(
          SIDEBAR_SAFE_SECTIONS,
          `${id} puts ${type} in the sidebar, where long names wrap to one word per line`,
        ).toContain(type)
      }
    })

    it('declares a sidebar only for a sidebar shell', () => {
      if (template.sidebarSections?.length) {
        expect(['sidebar-left', 'sidebar-right']).toContain(template.shell)
      }
    })

    it('has a default accent readable against white', () => {
      expect(contrastRatio(template.defaultAccent, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    })

    it('renders the demo CV with every section title exactly once', () => {
      const { container } = render(<CvDocument document={demoIn(id)} />)
      const titles = [...container.querySelectorAll('.cv-section__title')].map(
        (node) => node.textContent,
      )
      expect(titles.length).toBeGreaterThan(4)
      expect(new Set(titles).size).toBe(titles.length)
    })

    it('renders the personalia header exactly once', () => {
      const { container } = render(<CvDocument document={demoIn(id)} />)
      expect(container.querySelectorAll('.cv-header__name')).toHaveLength(1)
    })

    it('scopes its own stylesheet with a template class', () => {
      const { container } = render(<CvDocument document={demoIn(id)} />)
      expect(container.querySelector('.cv-doc')).toHaveClass(`cv-doc--${id}`)
    })
  },
)

describe('the template set', () => {
  it('has unique ids and names', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length)
  })

  it('covers every layout shell', () => {
    const shells = new Set(TEMPLATES.map((t) => t.shell))
    expect(shells).toContain('single')
    expect(shells).toContain('sidebar-left')
    expect(shells).toContain('sidebar-right')
    expect(shells).toContain('header-band')
  })

  it('keeps at least one strictly ATS-safe text-level template', () => {
    expect(TEMPLATES.some((t) => t.levelDisplay === 'text')).toBe(true)
  })
})

describe('template font pairings', () => {
  it('names only registered pairings', async () => {
    const { FONT_PAIRS } = await import('@/lib/theme/fonts')
    const ids = FONT_PAIRS.map((pair) => pair.id)

    for (const template of TEMPLATES) {
      if (!template.defaultFontPairId) continue
      expect(
        ids,
        `${template.id} names an unregistered pairing`,
      ).toContain(template.defaultFontPairId)
    }
  })
})
