'use client'

import { useLocale, useTranslations } from 'next-intl'

import { TextAreaField, TextField } from '@/components/editor/fields'
import { SectionHelp } from '@/components/editor/SectionHelp'
import type { CoverLetter } from '@/lib/schema/cv'

/**
 * The søknad, edited beside the CV it belongs with.
 *
 * Off by default. Most people write one for some applications and not others,
 * and a blank page appearing in front of every CV would be a worse default
 * than having to ask for it.
 */
export function CoverLetterForm({
  letter,
  onChange,
}: {
  letter: CoverLetter | undefined
  onChange: (patch: Partial<CoverLetter>) => void
}) {
  const t = useTranslations('letter')
  const locale = useLocale()
  const enabled = letter?.enabled ?? false

  const today = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t('title')}
        </h2>
        <SectionHelp topic="coverLetter" />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          checked={enabled}
          className="size-4 shrink-0 accent-brand"
          onChange={(event) =>
            onChange({
              enabled: event.target.checked,
              // The dateline is the one field nobody wants to type, and it is
              // wrong on every letter that is written and sent a week later.
              ...(event.target.checked && !letter?.date ? { date: today } : {}),
            })
          }
          type="checkbox"
        />
        {t('enable')}
      </label>

      {enabled ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* A textarea, because an address is more than one line and an
                <input> silently drops the newline you typed. */}
            <TextAreaField
              hint={t('recipientHint')}
              label={t('recipient')}
              onChange={(recipient) => onChange({ recipient })}
              rows={3}
              value={letter?.recipient ?? ''}
            />
            <TextField
              hint={t('positionHint')}
              label={t('position')}
              onChange={(position) => onChange({ position })}
              value={letter?.position ?? ''}
            />
            <TextField
              label={t('place')}
              onChange={(place) => onChange({ place })}
              value={letter?.place ?? ''}
            />
            <TextField
              label={t('date')}
              onChange={(date) => onChange({ date })}
              value={letter?.date ?? ''}
            />
          </div>

          <TextField
            hint={t('greetingHint')}
            label={t('greeting')}
            onChange={(greeting) => onChange({ greeting })}
            value={letter?.greeting ?? ''}
          />

          <TextAreaField
            hint={t('bodyHint')}
            label={t('body')}
            onChange={(body) => onChange({ body })}
            rows={12}
            value={letter?.body ?? ''}
          />

          <TextField
            label={t('closing')}
            onChange={(closing) => onChange({ closing })}
            value={letter?.closing ?? ''}
          />
        </div>
      ) : null}
    </section>
  )
}
