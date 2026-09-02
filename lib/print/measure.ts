import { pxToMm } from './paper'

export type PaddingBox = { paddingTop: string; paddingBottom: string }

/**
 * The height of a document's content box, in mm.
 *
 * `.cv-doc` carries the page's own padding and a `min-height` of one full page,
 * so its raw height is the *paper* height, not the content height. Counting
 * pages from the raw height reports two pages for an empty CV.
 */
export function contentHeightMm(
  element: { scrollHeight: number },
  style: PaddingBox,
): number {
  const padding =
    (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)

  return pxToMm(Math.max(0, element.scrollHeight - padding))
}
