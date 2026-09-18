import { expect, test } from '@playwright/test'

import { CV_DOCX, CV_PDF } from './import-fixtures'

/**
 * The import path end to end, in a real browser: the file picker, pdf.js and
 * the unzip under the production CSP, the review, and the CV that comes out.
 */

const review = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: 'Dette fant vi' })

test('a PDF becomes a CV, read in the browser under the production CSP', async ({ page }) => {
  const refused: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) refused.push(message.text())
  })

  await page.goto('/no/cv')
  await page.setInputFiles('input[type=file][accept*="docx"]', {
    name: 'kari.pdf',
    mimeType: 'application/pdf',
    buffer: CV_PDF,
  })

  await expect(review(page)).toBeVisible()
  await expect(review(page)).toContainText('Jobber')
  await review(page).getByRole('button', { name: 'Lag CV-en' }).click()

  await page.waitForURL(/\/no\/cv\/.+/)
  await expect(page.getByLabel('Fornavn')).toHaveValue('Kari')
  const preview = page.locator('.cv-doc').first()
  await expect(preview).toContainText('Veidekke')
  await expect(preview).toContainText('Ledet bygging av ny skole')

  // pdf.js reads the file with a worker from our own origin and no eval.
  expect(refused).toEqual([])
})

test('a Word file adds itself to the CV that is open, without overwriting it', async ({ page }) => {
  await page.goto('/no/templates')
  await page.locator('button[data-template="oslo"]').click()
  await page.getByRole('button', { name: 'Start ny CV' }).click()
  await page.waitForURL(/\/no\/cv\/.+/)

  await page.getByLabel('Fornavn').fill('Kari')
  await page.setInputFiles('input[type=file][accept*="docx"]', {
    name: 'ola.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: CV_DOCX,
  })

  await expect(review(page)).toBeVisible()
  await review(page).getByRole('button', { name: 'Legg til i CV-en' }).click()

  // The name typed here stays; the email the file had is filled in.
  await expect(page.getByLabel('Fornavn')).toHaveValue('Kari')
  await expect(page.getByLabel(/E-post/)).toHaveValue('ola@example.no')
  await expect(page.locator('.cv-doc').first()).toContainText('Acme')
})

test('a template picked in the gallery can be filled from a file', async ({ page }) => {
  await page.goto('/no/templates')
  await page.locator('button[data-template="fjord"]').click()
  await page.getByRole('dialog').getByLabel('Importer…').setInputFiles({
    name: 'ola.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: CV_DOCX,
  })

  await expect(review(page)).toBeVisible()
  await review(page).getByRole('button', { name: 'Lag CV-en' }).click()
  await page.waitForURL(/\/no\/cv\/.+/)
  await expect(page.locator('.cv-doc').first()).toHaveClass(/fjord/)
  await expect(page.getByLabel('Fornavn')).toHaveValue('Ola')
})

test('an old .doc is turned away with what to do about it', async ({ page }) => {
  await page.goto('/no/cv')
  await page.setInputFiles('input[type=file][accept*="docx"]', {
    name: 'gammel.doc',
    mimeType: 'application/msword',
    buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]),
  })

  // By its text, not by role: Next's route announcer is also role="alert".
  await expect(page.getByText(/eldre Word-fil \(\.doc\)/)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
