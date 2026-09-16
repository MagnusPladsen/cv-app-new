'use client'

import { AlertTriangle, CheckCircle2, Info, OctagonAlert, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { sectionFormId } from '@/components/editor/section-form-id'
import { checkDocument, sortFindings, type Severity } from '@/lib/quality/checks'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

const ICONS: Record<Severity, LucideIcon> = {
  error: OctagonAlert,
  warning: AlertTriangle,
  info: Info,
}

const TONE: Record<Severity, string> = {
  error: 'text-destructive',
  warning: 'text-amber-700',
  info: 'text-muted-foreground',
}

/**
 * What CVApp can tell you about your own CV without sending it anywhere.
 *
 * Every competitor's version of this runs a model on a server. Almost none of
 * what it reports needs one, so this is arithmetic on dates, a few presence
 * checks, and the conventions of the market you are applying in - which is
 * also the only version of the feature that can exist here at all.
 *
 * Findings are advice, never a gate: nothing here blocks an export, and the
 * panel says so by having no buttons but the ones that take you to the
 * section in question.
 */
export function QualityPanel({
  document,
  pages,
  onSelectSection,
}: {
  document: CvDocumentData
  pages: number
  onSelectSection: (sectionId: string) => void
}) {
  const t = useTranslations('quality')

  const findings = useMemo(
    () => sortFindings(checkDocument(document, { pages })),
    [document, pages],
  )

  const counts = {
    error: findings.filter((finding) => finding.severity === 'error').length,
    warning: findings.filter((finding) => finding.severity === 'warning').length,
    info: findings.filter((finding) => finding.severity === 'info').length,
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t('title')}
        </h2>
        {findings.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {[
              counts.error > 0 ? t('countErrors', { count: counts.error }) : null,
              counts.warning > 0 ? t('countWarnings', { count: counts.warning }) : null,
              counts.info > 0 ? t('countInfo', { count: counts.info }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </div>

      {findings.length === 0 ? (
        <p className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/50 px-3 py-2 text-sm text-brand-strong">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          {t('clean')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {findings.map((finding, index) => {
            const Icon = ICONS[finding.severity]
            return (
              <li
                className="flex gap-2.5 rounded-xl border border-border/70 bg-card/60 px-3 py-2.5"
                // The same check can fire for several entries, so the id alone
                // is not unique within a document.
                key={`${finding.id}-${finding.sectionId ?? ''}-${index}`}
              >
                <Icon
                  aria-hidden="true"
                  className={`mt-0.5 size-4 shrink-0 ${TONE[finding.severity]}`}
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm text-foreground">
                    <span className="sr-only">
                      {t(
                        finding.severity === 'error'
                          ? 'severityError'
                          : finding.severity === 'warning'
                            ? 'severityWarning'
                            : 'severityInfo',
                      )}
                      {': '}
                    </span>
                    {t(finding.id, finding.values)}
                  </p>
                  {finding.sectionId ? (
                    <button
                      className="inline-flex w-fit items-center rounded text-xs font-medium text-brand-strong underline-offset-2 transition hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                      onClick={() => {
                        onSelectSection(finding.sectionId!)
                        window.document
                          .getElementById(sectionFormId(finding.sectionId!))
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      type="button"
                    >
                      {t('goto')}
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
