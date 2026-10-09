import type { GuideDocument } from '@/lib/guide'

/**
 * The guide, as a page somebody reads rather than a wall of text.
 *
 * A table of contents at the top because the whole point is that people arrive
 * from a search with one question, and an FAQ at the bottom because the same
 * questions get asked over and over - the short answer first, the reasoning
 * above it for anyone who wants it.
 */
export function GuideView({ document }: { document: GuideDocument }) {
  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{document.title}</h1>
        <p className="text-lg text-foreground/80">{document.lede}</p>
        {document.intro.map((paragraph) => (
          <p className="text-foreground/80" key={paragraph.slice(0, 40)}>
            {paragraph}
          </p>
        ))}
      </header>

      <nav aria-label={document.tocHeading} className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {document.tocHeading}
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {document.sections.map((section) => (
            <li key={section.id}>
              <a
                className="text-sm text-brand-strong underline-offset-2 hover:underline"
                href={`#${section.id}`}
              >
                {section.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {document.sections.map((section) => (
        <section className="flex scroll-mt-24 flex-col gap-2" id={section.id} key={section.id}>
          <h2 className="text-xl font-bold text-brand-strong">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p className="text-foreground/80" key={paragraph.slice(0, 40)}>
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <section className="flex flex-col gap-4" id="faq">
        <h2 className="text-xl font-bold text-brand-strong">{document.faqHeading}</h2>
        <dl className="flex flex-col gap-3">
          {document.faq.map((entry) => (
            <div
              className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card/40 px-4 py-3"
              key={entry.question}
            >
              <dt className="font-semibold">{entry.question}</dt>
              <dd className="text-foreground/80">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  )
}
