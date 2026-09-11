import Image from 'next/image'

import { getTemplate } from '@/components/cv/templates'
import { PAPER, mmToPx } from '@/lib/print/paper'

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
 * The same stills the gallery cards use, so the hero cannot drift from the
 * product: they are captured from the templates themselves by
 * scripts/generate-template-thumbnails.mjs. Three live CVs above the fold cost
 * more than the hero is worth, and none of it was ever interactive.
 */
export function HeroTemplates() {
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
          <div
            className="absolute"
            key={id}
            style={{ left, top, width: '58%', transform: `rotate(${rotate}deg)`, zIndex: index }}
          >
            <div
              className="relative w-full overflow-hidden rounded-md bg-white shadow-[0_26px_60px_-26px_rgb(15_35_45/0.45)]"
              style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
            >
              <Image
                alt=""
                className="object-cover"
                fill
                // Above the fold, so these are the one set worth fetching
                // eagerly rather than on approach.
                priority
                sizes="(min-width: 1024px) 22vw, 40vw"
                src={`/templates/${template.id}.png`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
