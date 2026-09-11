/**
 * Regenerates public/templates/<id>.png, the still of every template.
 *
 * Run with `bun run dev` already serving on port 3001:
 *   bun scripts/generate-template-thumbnails.mjs
 *
 * The gallery used to render fourteen live CVs, and the landing page three
 * more on top of the fourteen - roughly two thousand DOM nodes of typeset
 * document, all of it work the browser redid on every scroll and resize. None
 * of it was interactive: the cards show the demo CV in the template's own
 * default colours and nothing else. A still says the same thing.
 *
 * Captured from the proof sheet inside the running app, not from a standalone
 * document: next/font serves its faces from relative URLs, so a page built
 * with setContent has no base URL to resolve them against and silently falls
 * back to a serif. The proof sheet keeps rendering live, which is what makes
 * it a dependable source after the product pages stop.
 *
 * Re-run it whenever a template's CSS, the demo CV, or the paper geometry
 * changes. `bun run test` fails if a template has no still at all, but it
 * cannot tell you a still has gone stale.
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// A4 is 794x1123 CSS px at the app's 96dpi geometry. Captured at 360 CSS px
// on a 2x screen, so 720x1018 device pixels: comfortably above a gallery card
// (~230px) and a hero sheet (~330px) at twice their size, without carrying a
// full-resolution page in the repo for every template.
const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const WIDTH = 360
const HEIGHT = (WIDTH * PAGE_HEIGHT) / PAGE_WIDTH
const SCALE = WIDTH / PAGE_WIDTH

const OUT = 'public/templates'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: WIDTH, height: Math.ceil(HEIGHT) },
  deviceScaleFactor: 2,
})

await page.goto('http://localhost:3001/no/preview', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

// Take every sheet's markup up front. The capture loop replaces the body, so
// after the first template the page is no longer the proof sheet.
const ids = await page.evaluate(() => {
  const templateId = (node) =>
    [...node.classList].find((name) => name.startsWith('cv-doc--'))?.slice('cv-doc--'.length)

  window.__sheets = {}
  for (const node of document.querySelectorAll('.cv-doc')) {
    const id = templateId(node)
    if (id) window.__sheets[id] = node.outerHTML
  }
  return Object.keys(window.__sheets)
})

if (ids.length === 0) throw new Error('no .cv-doc on the proof sheet - is the dev server on 3001?')

for (const id of ids) {
  await page.evaluate(
    ({ id, width, pageWidth, scale }) => {
      // setAttribute, not a className write: next/font puts its face on the
      // body class, and losing it renders every still in a fallback serif.
      document.body.setAttribute(
        'style',
        `margin:0;width:${width}px;overflow:hidden;background:#ffffff`,
      )
      document.body.innerHTML =
        `<div style="width:${pageWidth}px;transform:scale(${scale});transform-origin:top left">` +
        `${window.__sheets[id]}</div>`
    },
    { id, width: WIDTH, pageWidth: PAGE_WIDTH, scale: SCALE },
  )

  // The demo CV carries a portrait. An <img> re-inserted this way starts its
  // request over, and a half-loaded photo captures as a blank box.
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  )

  await page.screenshot({
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    path: `${OUT}/${id}.png`,
  })
  console.log(`${OUT}/${id}.png`)
}

await browser.close()
console.log(`\n${ids.length} stills at ${WIDTH * 2}x${Math.round(HEIGHT * 2)}`)
