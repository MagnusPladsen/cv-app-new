import { CvDocument } from '@/components/cv/CvDocument'
import { getTemplate } from '@/components/cv/templates'
import { PAPER, mmToPx } from '@/lib/print/paper'
import { createDemoDocument } from '@/lib/schema/demo'

/** The three the fan reads best with: plain, full-colour column, and band. */
const SHOWCASE = ['oslo', 'fjord', 'aurora'] as const

const PAGE_WIDTH = mmToPx(PAPER.a4.widthMm)
const PAGE_HEIGHT = mmToPx(PAPER.a4.heightMm)

/** Where each sheet sits in the fan, as a share of the container. */
const LAYOUT = [
  { left: '0%', top: '6%', rotate: -6 },
  { left: '21%', top: '0%', rotate: -1 },
  { left: '42%', top: '5%', rotate: 4 },
] as const

/**
 * The fanned CV sheets in the landing hero, the same idea as the share card.
 *
 * Real templates rendering the demo CV rather than a picture of them, so the
 * hero cannot drift from the product and the sheets stay crisp at any zoom.
 *
 * Each sheet is its own `container-type: inline-size` box scaled by
 * `100cqw / <page width>px`, the pattern the gallery card already uses. That
 * keeps one component correct at every width instead of a set of breakpoints.
 */
export function HeroTemplates() {
  const demo = createDemoDocument()

  return (
    <div
      aria-hidden="true"
      // Aspect ratio fixed so the fan reserves its height before the sheets
      // paint, rather than shoving the page down as they arrive.
      className="relative w-full select-none"
      style={{ aspectRatio: '11 / 9' }}
    >
      {SHOWCASE.map((id, index) => {
        const template = getTemplate(id)
        const { left, top, rotate } = LAYOUT[index]!

        return (
          // The rotation is on this wrapper, never on the query container
          // itself. A transform on the container makes `100cqw` unreliable -
          // it resolved correctly in Chromium and rendered the sheets at
          // roughly double size elsewhere, cropping every one. Keeping the
          // container untransformed is what makes the scale dependable.
          <div
            className="absolute"
            key={id}
            style={{ left, top, width: '58%', transform: `rotate(${rotate}deg)`, zIndex: index }}
          >
            <div
              className="relative w-full overflow-hidden rounded-md bg-white shadow-[0_26px_60px_-26px_rgb(15_35_45/0.45)]"
              style={{
                aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}`,
                containerType: 'inline-size',
              }}
            >
            <span
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
                // length / length yields a unitless number, which scale() needs.
                transform: `scale(calc(100cqw / ${PAGE_WIDTH}px))`,
              }}
            >
              <CvDocument
                document={{
                  ...demo,
                  theme: {
                    ...demo.theme,
                    templateId: template.id,
                    accent: template.defaultAccent,
                    fontPairId: template.defaultFontPairId ?? demo.theme.fontPairId,
                  },
                }}
              />
            </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
