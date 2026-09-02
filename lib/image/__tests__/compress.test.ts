import { describe, expect, it, vi } from 'vitest'
import { MAX_PHOTO_EDGE_PX, compressImage, fitWithin } from '@/lib/image/compress'

describe('fitWithin', () => {
  it('leaves a small image alone', () => {
    expect(fitWithin(300, 200, 600)).toEqual({ width: 300, height: 200 })
  })

  it('scales a landscape image by its width', () => {
    expect(fitWithin(1200, 600, 600)).toEqual({ width: 600, height: 300 })
  })

  it('scales a portrait image by its height', () => {
    expect(fitWithin(600, 1200, 600)).toEqual({ width: 300, height: 600 })
  })

  it('rounds to whole pixels', () => {
    const { width, height } = fitWithin(1000, 333, 600)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('never returns a zero dimension', () => {
    expect(fitWithin(10_000, 1, 600).height).toBeGreaterThanOrEqual(1)
  })
})

describe('compressImage', () => {
  function fakes(naturalWidth: number, naturalHeight: number) {
    const drawImage = vi.fn()
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,COMPRESSED'),
    }
    return {
      drawImage,
      canvas,
      deps: {
        createImage: async () => ({ naturalWidth, naturalHeight }) as HTMLImageElement,
        createCanvas: () => canvas as unknown as HTMLCanvasElement,
      },
    }
  }

  const png = () => new File([], 'a.png', { type: 'image/png' })

  it('returns a JPEG data URL', async () => {
    const { deps } = fakes(1200, 900)
    await expect(compressImage(png(), deps)).resolves.toBe('data:image/jpeg;base64,COMPRESSED')
  })

  it('sizes the canvas to the fitted dimensions', async () => {
    const { canvas, deps } = fakes(1200, 900)
    await compressImage(png(), deps)
    expect(canvas.width).toBe(MAX_PHOTO_EDGE_PX)
    expect(canvas.height).toBe(450)
  })

  it('encodes as JPEG at the configured quality', async () => {
    const { canvas, deps } = fakes(1200, 900)
    await compressImage(png(), deps)
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.82)
  })

  it('leaves an already-small photo at its own size', async () => {
    const { canvas, deps } = fakes(320, 240)
    await compressImage(png(), deps)
    expect(canvas.width).toBe(320)
    expect(canvas.height).toBe(240)
  })

  it('rejects a file that is not an image', async () => {
    const { deps } = fakes(10, 10)
    const notAnImage = new File([], 'a.pdf', { type: 'application/pdf' })
    await expect(compressImage(notAnImage, deps)).rejects.toThrow('not an image')
  })
})
