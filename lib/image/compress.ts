export const MAX_PHOTO_EDGE_PX = 600
export const PHOTO_QUALITY = 0.82

export type Dimensions = { width: number; height: number }

/** Scales `width` x `height` down so its longest edge is at most `maxEdge`. */
export function fitWithin(width: number, height: number, maxEdge: number): Dimensions {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }

  const ratio = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

export type CompressDeps = {
  createImage: (file: File) => Promise<HTMLImageElement>
  createCanvas: () => HTMLCanvasElement
}

function defaultCreateImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The image could not be read.'))
    }
    image.src = url
  })
}

const defaultDeps: CompressDeps = {
  createImage: defaultCreateImage,
  createCanvas: () => document.createElement('canvas'),
}

/**
 * Downscales and re-encodes a photo as a JPEG data URL.
 *
 * Photos are on by default and localStorage holds roughly 5 MB for every CV
 * combined, so a phone photo has to shrink before it reaches the store.
 */
export async function compressImage(
  file: File,
  deps: CompressDeps = defaultDeps,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }

  const image = await deps.createImage(file)
  const { width, height } = fitWithin(
    image.naturalWidth,
    image.naturalHeight,
    MAX_PHOTO_EDGE_PX,
  )

  const canvas = deps.createCanvas()
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot process images.')

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY)
}
