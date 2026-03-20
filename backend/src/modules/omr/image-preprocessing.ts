import Jimp from "jimp"

export type PreprocessedImage = {
  image: Jimp
  width: number
  height: number
  binarizationThreshold: number
  autoRotationAngle: number
}

function grayscaleIntensity(pixel: number): number {
  return pixel & 0xff
}

function otsuThreshold(image: Jimp): number {
  const hist = new Array<number>(256).fill(0)
  const { width, height } = image.bitmap

  image.scan(0, 0, width, height, function build(_x, _y, idx) {
    hist[grayscaleIntensity(this.bitmap.data[idx] ?? 0)] += 1
  })

  const total = width * height
  let sum = 0
  for (let i = 0; i < 256; i += 1) sum += i * hist[i]

  let sumB = 0
  let wB = 0
  let maxVariance = 0
  let threshold = 127

  for (let t = 0; t < 256; t += 1) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break

    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF

    const variance = wB * wF * (mB - mF) ** 2
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }

  return threshold
}

function projectionScore(image: Jimp): number {
  const { width, height } = image.bitmap
  let transitions = 0

  for (let y = 0; y < height; y += 12) {
    let prev = 255
    for (let x = 0; x < width; x += 4) {
      const value = grayscaleIntensity(image.getPixelColor(x, y))
      if ((value < 128) !== (prev < 128)) transitions += 1
      prev = value
    }
  }

  return transitions
}

function autoRotateLight(image: Jimp): { image: Jimp; angle: number } {
  let best = image.clone()
  let bestAngle = 0
  let bestScore = -1

  for (const angle of [-3, -2, -1, 0, 1, 2, 3]) {
    const candidate = image.clone().rotate(angle, false)
    const score = projectionScore(candidate)
    if (score > bestScore) {
      bestScore = score
      best = candidate
      bestAngle = angle
    }
  }

  return { image: best, angle: bestAngle }
}

function normalizeContent(image: Jimp): Jimp {
  const { width, height } = image.bitmap
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const v = grayscaleIntensity(image.getPixelColor(x, y))
      if (v < 140) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (minX >= maxX || minY >= maxY) return image

  const padding = 10
  const cropX = Math.max(0, minX - padding)
  const cropY = Math.max(0, minY - padding)
  const cropW = Math.min(width - cropX, maxX - minX + padding * 2)
  const cropH = Math.min(height - cropY, maxY - minY + padding * 2)

  return image.clone().crop(cropX, cropY, cropW, cropH).resize(1200, 1700)
}

export async function preprocessImage(imagePath: string): Promise<PreprocessedImage> {
  const loaded = await Jimp.read(imagePath)
  const gray = loaded.greyscale().normalize().contrast(0.22)
  const rotated = autoRotateLight(gray)
  const normalized = normalizeContent(rotated.image)

  const threshold = otsuThreshold(normalized)

  normalized.scan(0, 0, normalized.bitmap.width, normalized.bitmap.height, function apply(_x, _y, idx) {
    const value = grayscaleIntensity(this.bitmap.data[idx] ?? 0)
    const binary = value < threshold ? 0 : 255
    this.bitmap.data[idx] = binary
    this.bitmap.data[idx + 1] = binary
    this.bitmap.data[idx + 2] = binary
  })

  return {
    image: normalized,
    width: normalized.bitmap.width,
    height: normalized.bitmap.height,
    binarizationThreshold: threshold,
    autoRotationAngle: rotated.angle,
  }
}
