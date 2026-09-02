import { CvDocument } from '@/components/cv/CvDocument'
import { TEMPLATES } from '@/components/cv/templates'
import { mmToPx, PAPER } from '@/lib/print/paper'
import { createDemoDocument } from '@/lib/schema/demo'

const SCALE = 0.3

/**
 * Template proof sheet: every registered template rendering the same realistic
 * CV, side by side. This is the page each template task screenshots for review.
 */
export default function TemplatePreviewPage() {
  const demo = createDemoDocument()
  const width = mmToPx(PAPER.a4.widthMm)

  return (
    <main className="mx-auto flex max-w-none flex-col gap-8 bg-neutral-200/60 px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Maler ({TEMPLATES.length})</h1>

      <div className="flex flex-wrap gap-10">
        {TEMPLATES.map((template) => (
          <section className="flex flex-col gap-2" key={template.id}>
            <h2 className="text-sm font-semibold">{template.name}</h2>
            <div style={{ width: width * SCALE }}>
              <div
                className="origin-top-left shadow-[0_10px_40px_-12px_rgb(0_0_0/0.35)]"
                style={{ transform: `scale(${SCALE})`, width }}
              >
                <CvDocument
                  document={{
                    ...demo,
                    theme: {
                      ...demo.theme,
                      templateId: template.id,
                      accent: template.defaultAccent,
                    },
                  }}
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
