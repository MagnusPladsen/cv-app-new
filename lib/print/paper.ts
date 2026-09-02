import type { PaperId } from '@/lib/schema/cv'

export const PAPER = {
  a4: { widthMm: 210, heightMm: 297, cssSize: 'A4' },
  letter: { widthMm: 215.9, heightMm: 279.4, cssSize: 'Letter' },
} as const satisfies Record<PaperId, { widthMm: number; heightMm: number; cssSize: string }>

export const DEFAULT_MARGIN_MM = 16

const MM_PER_INCH = 25.4
const CSS_PX_PER_INCH = 96

/** Guards against float noise making a perfectly-filled page count as two. */
const EPSILON_MM = 0.01

export function mmToPx(mm: number): number {
  return (mm / MM_PER_INCH) * CSS_PX_PER_INCH
}

export function pxToMm(px: number): number {
  return (px / CSS_PX_PER_INCH) * MM_PER_INCH
}

export function usableHeightMm(paper: PaperId, marginMm: number = DEFAULT_MARGIN_MM): number {
  return PAPER[paper].heightMm - marginMm * 2
}

export function countPages(
  contentHeightMm: number,
  paper: PaperId,
  marginMm: number = DEFAULT_MARGIN_MM,
): number {
  const usable = usableHeightMm(paper, marginMm)
  if (usable <= 0) return 1
  return Math.max(1, Math.ceil((contentHeightMm - EPSILON_MM) / usable))
}

export function pageBreakOffsetsMm(
  contentHeightMm: number,
  paper: PaperId,
  marginMm: number = DEFAULT_MARGIN_MM,
): number[] {
  const usable = usableHeightMm(paper, marginMm)
  const pages = countPages(contentHeightMm, paper, marginMm)
  return Array.from({ length: pages - 1 }, (_, index) => usable * (index + 1))
}
