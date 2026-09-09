/**
 * Regenerates app/opengraph-image.png, the link-preview card.
 *
 * Run with `bun run dev` already serving on port 3001:
 *   bun scripts/generate-og-image.mjs
 *
 * Rendered from the running app rather than at request time, so the card uses
 * the real palette and the real typeface with no runtime cost and no font
 * loading to go wrong in production.
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const icon = readFileSync('app/icon.svg', 'utf8').replace(/width="64" height="64" /, 'width="100%" height="100%" ')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

// Rendered inside the live page rather than via setContent: next/font's
// @font-face URLs are relative, so a document with no base URL silently falls
// back to a serif.
await page.goto('http://localhost:3001/no', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

await page.evaluate((iconSvg) => {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;gap:24px">
      <div style="width:108px;height:108px">${iconSvg}</div>
      <div style="font-size:76px;font-weight:800;letter-spacing:-0.03em;color:#0f766e">CVApp</div>
      <div style="align-self:flex-start;margin-top:14px;background:#e2efec;color:#0d5f59;font-size:22px;font-weight:700;letter-spacing:0.1em;padding:8px 16px;border-radius:999px">BETA</div>
    </div>
    <div style="font-size:60px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;color:#1c2422;max-width:940px">Lag en CV du er stolt av</div>
    <div style="font-size:32px;color:#5b6472;line-height:1.35;max-width:900px">Fjorten maler, ekte PDF, ingen vannmerke. Gratis i beta.</div>`
  document.body.setAttribute(
    'style',
    'margin:0;width:1200px;height:630px;display:flex;flex-direction:column;justify-content:center;gap:34px;padding:0 96px;background:#faf7f2;background-image:radial-gradient(900px 520px at 8% -10%, rgba(15,118,110,0.16), transparent 60%)',
  )
}, icon)

await page.evaluate(() => document.fonts.ready)
console.log('font:', await page.evaluate(() => getComputedStyle(document.body).fontFamily))
await page.screenshot({ path: 'app/opengraph-image.png' })
await browser.close()
console.log('rendered app/opengraph-image.png')
