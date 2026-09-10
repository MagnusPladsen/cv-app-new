'use client'

import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { getTemplate } from '@/components/cv/templates'
import { SelectField } from '@/components/editor/fields'
import { PAPER } from '@/lib/print/paper'
import type { CvTheme, Density, PaperId } from '@/lib/schema/cv'
import { contrastRatio } from '@/lib/theme/contrast'
import { FONT_PAIRS } from '@/lib/theme/fonts'
import { ColourPicker } from './ColourPicker'

const DENSITIES: Density[] = ['compact', 'normal', 'roomy']

/** WCAG AA for normal text. Below this the accent is unreadable on white paper. */
const MIN_ACCENT_CONTRAST = 4.5

/**
 * Collapsed by default: the editor should open on your content, not on styling
 * controls. The fields stay in the DOM while closed, so they remain findable.
 */
export function DesignPanel({
  theme,
  paper,
  onThemeChange,
  onPaperChange,
}: {
  theme: CvTheme
  paper: PaperId
  onThemeChange: (patch: Partial<CvTheme>) => void
  onPaperChange: (paper: PaperId) => void
}) {
  const t = useTranslations('design')
  const template = getTemplate(theme.templateId)
  const lowContrast = contrastRatio(theme.accent, '#ffffff') < MIN_ACCENT_CONTRAST

  return (
    <details className="group rounded-xl border border-border bg-card">
      {/* Styled as a button, not a heading. As plain uppercase label text
          nobody read it as something to click, so the colour and typeface
          controls were effectively hidden. */}
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-brand-soft/60 hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
        <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0 text-brand" />
        <span className="flex-1">{t('colours')}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180"
        />
      </summary>

      <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
        <ColourPicker
          customLabel={t('custom')}
          label={t('accent')}
          onChange={(accent) => onThemeChange({ accent })}
          swatches={template.swatches}
          value={theme.accent}
        />

        {lowContrast ? <p className="text-xs text-amber-700">{t('contrastWarning')}</p> : null}

        <SelectField
          label={t('font')}
          onChange={(fontPairId) => onThemeChange({ fontPairId })}
          options={FONT_PAIRS.map((pair) => ({ value: pair.id, label: pair.name }))}
          value={theme.fontPairId}
        />

        <SelectField
          label={t('density')}
          onChange={(density) => onThemeChange({ density: density as Density })}
          options={DENSITIES.map((density) => ({
            value: density,
            label: t(
              density === 'compact'
                ? 'densityCompact'
                : density === 'roomy'
                  ? 'densityRoomy'
                  : 'densityNormal',
            ),
          }))}
          value={theme.density}
        />

        <SelectField
          label={t('paper')}
          onChange={(value) => onPaperChange(value as PaperId)}
          options={(Object.keys(PAPER) as PaperId[]).map((id) => ({
            value: id,
            label: PAPER[id].cssSize,
          }))}
          value={paper}
        />
      </div>
    </details>
  )
}
