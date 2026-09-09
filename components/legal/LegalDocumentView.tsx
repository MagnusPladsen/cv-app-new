import type { LegalDocument } from '@/lib/legal'
import { PROCESSORS } from '@/lib/privacy/processors'

/**
 * Renders a legal document. The processors section renders the live
 * `PROCESSORS` list rather than prose, so the published list and the one the
 * drift test checks cannot disagree.
 */
export function LegalDocumentView({
  document,
  locale,
  processorHeadings,
}: {
  document: LegalDocument
  locale: 'no' | 'en'
  processorHeadings: { name: string; purpose: string; country: string }
}) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
        <p className="text-sm text-muted-foreground">
          <time dateTime={document.lastUpdated}>{document.lastUpdated}</time>
        </p>
        {document.intro.map((paragraph) => (
          <p className="text-foreground/80" key={paragraph.slice(0, 40)}>
            {paragraph}
          </p>
        ))}
      </header>

      {document.sections.map((section) => (
        <section className="flex flex-col gap-2" id={section.id} key={section.id}>
          <h2 className="text-lg font-bold text-brand-strong">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p className="text-sm text-foreground/80" key={paragraph.slice(0, 40)}>
              {paragraph}
            </p>
          ))}

          {section.id === 'processors' ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-semibold">{processorHeadings.name}</th>
                    <th className="py-2 pr-4 font-semibold">{processorHeadings.purpose}</th>
                    <th className="py-2 font-semibold">{processorHeadings.country}</th>
                  </tr>
                </thead>
                <tbody>
                  {PROCESSORS.map((processor) => (
                    <tr className="border-b border-border/60" key={processor.name}>
                      <td className="py-2 pr-4 font-medium">{processor.name}</td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {processor.purpose[locale]}
                      </td>
                      <td className="py-2 text-foreground/80">{processor.country[locale]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ))}
    </article>
  )
}
