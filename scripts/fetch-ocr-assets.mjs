/**
 * Puts the OCR engine where the browser can fetch it from our own origin.
 *
 * Tesseract normally loads its WebAssembly core and its language data from a
 * CDN. This app's CSP allows neither, and the whole point of reading a CV in
 * the browser is that nothing about it leaves the machine - asking a third
 * party for the Norwegian model would announce that somebody is importing a
 * scanned Norwegian CV. So both are served from /ocr.
 *
 * Not committed: 7 MB of binaries do not belong in a public git history. This
 * runs before the build, and caches what it downloads. If it cannot get the
 * language data the build still succeeds - the app then says a scan cannot be
 * read, which is what it said before OCR existed.
 */
import { createWriteStream } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const OUT = new URL('../public/ocr/', import.meta.url)

/**
 * The LSTM-only cores: 2.7 MB rather than 3.3, and the only engine we use.
 * All three builds, because Tesseract picks one by what the browser supports
 * - relaxed SIMD, SIMD, or neither - and asks for it by name. Only the one
 * that fits is ever downloaded by a visitor.
 */
const VARIANTS = ['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm']

const FROM_PACKAGES = [
  ['../node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ...VARIANTS.flatMap((variant) =>
    ['.js', '.wasm', '.wasm.js'].map((extension) => [
      `../node_modules/tesseract.js-core/${variant}${extension}`,
      `${variant}${extension}`,
    ]),
  ),
]

/** tessdata_fast: a tenth the size of the best models, and quick enough. */
const LANGUAGES = ['nor', 'eng']
const TESSDATA = 'https://tessdata.projectnaptha.com/4.0.0_fast'

const exists = (url) =>
  stat(url).then(
    (info) => info.size > 0,
    () => false,
  )

await mkdir(OUT, { recursive: true })

for (const [from, name] of FROM_PACKAGES) {
  await copyFile(new URL(from, import.meta.url), new URL(name, OUT))
}

for (const language of LANGUAGES) {
  const name = `${language}.traineddata.gz`
  const target = new URL(name, OUT)
  if (await exists(target)) continue

  try {
    const response = await fetch(`${TESSDATA}/${name}`)
    if (!response.ok) throw new Error(`${response.status}`)
    await pipeline(Readable.fromWeb(response.body), createWriteStream(target))
  } catch (error) {
    console.warn(`OCR: could not fetch ${name} (${error}). Scans will not be readable.`)
  }
}

console.log('OCR assets ready in public/ocr')
