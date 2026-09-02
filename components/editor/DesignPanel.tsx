'use client'

import { useTranslations } from 'next-intl'

import { getTemplate, TEMPLATES } from '@/components/cv/templates'
import { SelectField } from '@/components/editor/fields'
import { PAPER } from '@/lib/print/paper'
import type { CvTheme, Density, PaperId } from '@/lib/schema/cv'
import { contrastRatio } from '@/lib/theme/contrast'
import { FONT_PAIRS } from '@/lib/theme/fonts'
import { ColourPicker } from './ColourPicker'

const DENSITIES: Density[] = ['compact', 'normal', 'roomy']

/** WCAG AA for normal text. Below this the accent is unreadable on white paper. */
const MIN_ACCENT_CONTRAST = 4.5

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
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {t('title')}
      </h2>

      <SelectField
        label={t('template')}
        onChange={(templateId) => onThemeChange({ templateId })}
        options={TEMPLATES.map((candidate) => ({
          value: candidate.id,
          label: candidate.name,
        }))}
        value={theme.templateId}
      />

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
    </section>
  )
}
