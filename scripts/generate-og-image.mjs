/**
 * Regenerates app/opengraph-image.png, the link-preview card.
 *
 * Run with `bun run dev` already serving on port 3001:
 *   bun scripts/generate-og-image.mjs
 *
 * Composed inside the running app rather than generated at request time. Two
 * things make that the right call: the card shows real rendered templates
 * rather than a mock-up of them, and next/font serves its faces from relative
 * URLs, so a standalone document silently falls back to a serif.
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const icon = readFileSync('app/icon.svg', 'utf8').replace(
  /width="64" height="64" /,
  'width="100%" height="100%" ',
)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })

// The proof sheet renders every template with the demo CV, so the cards on the
// share image are the real thing.
await page.goto('http://localhost:3001/no/preview', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

await page.evaluate((iconSvg) => {
  const pick = ['oslo', 'fjord', 'aurora']
  // Just the .cv-doc, not the proof sheet's own scaled wrapper: reusing that
  // wrapper put an unscaled 794px page inside a 300px box, so every sheet
  // rendered cropped and unreadable.
  const sheets = pick
    .map((id) => document.querySelector(`.cv-doc--${id}`)?.outerHTML ?? '')
    .filter(Boolean)

  // A4 is 794x1123 CSS px at the app's 96dpi geometry.
  const CARD_W = 250
  const SCALE = CARD_W / 794
  const CARD_H = Math.round(1123 * SCALE)

  document.body.setAttribute(
    'style',
    'margin:0;width:1200px;height:630px;overflow:hidden;position:relative;background:#faf7f2;' +
      'background-image:radial-gradient(760px 460px at 4% -14%, rgba(15,118,110,0.18), transparent 62%)',
  )

  document.body.innerHTML = `
    <div style="position:absolute;inset:0;display:flex;align-items:center">
      <div style="flex:0 0 620px;padding-left:82px;display:flex;flex-direction:column;gap:26px">
        <div style="display:flex;align-items:center;gap:18px">
          <div style="width:76px;height:76px">${iconSvg}</div>
          <div style="font-size:54px;font-weight:800;letter-spacing:-0.03em;color:#0f766e">CVApp</div>
          <div style="align-self:flex-start;margin-top:10px;background:#e2efec;color:#0d5f59;font-size:17px;font-weight:700;letter-spacing:0.1em;padding:6px 13px;border-radius:999px">BETA</div>
        </div>
        <div style="font-size:54px;font-weight:700;line-height:1.08;letter-spacing:-0.02em;color:#1c2422">Lag en CV du er stolt av</div>
        <div style="font-size:26px;color:#5b6472;line-height:1.35">Fjorten maler, ekte PDF,<br>ingen vannmerke. Gratis i beta.</div>
      </div>

      <div style="flex:1;position:relative;height:630px">
        ${sheets
          .map(
            (html, i) => `
          <div style="position:absolute;top:${118 + i * 14}px;left:${18 + i * 132}px;
                      width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;
                      transform:rotate(${-6 + i * 5}deg);
                      border-radius:5px;background:#fff;
                      box-shadow:0 24px 56px -20px rgba(15,35,45,0.4)">
            <div style="transform:scale(${SCALE});transform-origin:top left;width:794px">${html}</div>
          </div>`,
          )
          .join('')}
      </div>
    </div>`
}, icon)

await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
await page.screenshot({ path: 'app/opengraph-image.png', scale: 'css' })
await browser.close()
console.log('rendered app/opengraph-image.png')
