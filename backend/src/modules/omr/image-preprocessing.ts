import Jimp from "jimp"

type BoundingBox = {
  x: number
  y: number
  width: number
  height: number
}

type CropMetadata = {
  boundingBoxDetected: boolean
  cropApplied: boolean
  cropFallbackUsed: boolean
  originalWidth: number
  originalHeight: number
  processedWidth: number
  processedHeight: number
}

type CropResult = {
  image: Jimp
  metadata: CropMetadata
}

export type RotationCandidate = {
  angle: number
  score: number
}

export type PreprocessedImage = {
  image: Jimp
  width: number
  height: number
  binarizationThreshold: number
  autoRotationAngle: number
  rotationCandidates: RotationCandidate[]
  rotationConfidence: number
  boundingBoxDetected: boolean
  cropApplied: boolean
  cropFallbackUsed: boolean
  originalWidth: number
  originalHeight: number
  processedWidth: number
  processedHeight: number
}

function grayscaleByte(value: number): number {
  return value
}

function grayscalePixel(pixel: number): number {
  return Jimp.intToRGBA(pixel).r
}

function otsuThreshold(image: Jimp): number {
  const hist = new Array<number>(256).fill(0)
  const { width, height } = image.bitmap

  image.scan(0, 0, width, height, function build(_x, _y, idx) {
    hist[grayscaleByte(this.bitmap.data[idx] ?? 0)] += 1
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
      const value = grayscalePixel(image.getPixelColor(x, y))
      if ((value < 128) !== (prev < 128)) transitions += 1
      prev = value
    }
  }

  return transitions
}

function centerOf(box: BoundingBox): { x: number; y: number } {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
}

function markerAlignmentScore(image: Jimp): number | null {
  const { width, height } = image.bitmap
  const topLeft = detectCornerMarker(image, 'top-left')
  const topRight = detectCornerMarker(image, 'top-right')
  const bottomLeft = detectCornerMarker(image, 'bottom-left')
  const bottomRight = detectCornerMarker(image, 'bottom-right')

  if (!topLeft || !topRight || !bottomLeft || !bottomRight) return null

  const tl = centerOf(topLeft)
  const tr = centerOf(topRight)
  const bl = centerOf(bottomLeft)
  const br = centerOf(bottomRight)
  const horizontalSkew = (Math.abs(tl.y - tr.y) + Math.abs(bl.y - br.y)) / height
  const verticalSkew = (Math.abs(tl.x - bl.x) + Math.abs(tr.x - br.x)) / width
  const diagonalBalance = Math.abs(Math.hypot(tr.x - tl.x, br.y - tr.y) - Math.hypot(br.x - bl.x, bl.y - tl.y)) / height

  return Math.max(0, 10_000 - (horizontalSkew + verticalSkew + diagonalBalance) * 10_000)
}

function scoreRotationCandidate(image: Jimp): number {
  return markerAlignmentScore(image) ?? projectionScore(image)
}

function chooseRotationCandidate(candidates: RotationCandidate[]): RotationCandidate {
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const equivalentScoreDelta = Math.max(5, Math.abs(top.score) * 0.01)
  const equivalent = sorted.filter((candidate) => top.score - candidate.score <= equivalentScoreDelta)

  return equivalent.sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle) || a.angle - b.angle)[0]
}

function autoRotateLight(image: Jimp): { image: Jimp; angle: number; candidates: RotationCandidate[]; confidence: number } {
  const candidates = [-3, -2, -1, 0, 1, 2, 3].map((angle) => {
    const candidate = image.clone().rotate(angle, false)
    return {
      angle,
      score: scoreRotationCandidate(candidate),
    }
  })
  const selected = chooseRotationCandidate(candidates)
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const topScore = sorted[0]?.score ?? 0
  const secondScore = sorted[1]?.score ?? 0
  const confidence = topScore > 0 ? Math.max(0, Math.min(1, (topScore - secondScore) / topScore)) : 0

  if (selected.angle === 0) {
    return { image: image.clone(), angle: 0, candidates, confidence }
  }

  return { image: image.clone().rotate(selected.angle, false), angle: selected.angle, candidates, confidence }
}

function cropApplied(box: BoundingBox, width: number, height: number): boolean {
  return box.x > 0 || box.y > 0 || box.width < width || box.height < height
}

function normalizeBox(box: BoundingBox, width: number, height: number): BoundingBox {
  const x = Math.max(0, Math.floor(box.x))
  const y = Math.max(0, Math.floor(box.y))
  const right = Math.min(width, Math.ceil(box.x + box.width))
  const bottom = Math.min(height, Math.ceil(box.y + box.height))

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  }
}

function applyNormalizedCrop(image: Jimp, box: BoundingBox): Jimp {
  return image.clone().crop(box.x, box.y, box.width, box.height).resize(1200, 1700)
}

function detectCornerMarker(
  image: Jimp,
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
): BoundingBox | null {
  const { width, height } = image.bitmap
  const zoneWidth = Math.round(width * 0.18)
  const zoneHeight = Math.round(height * 0.18)
  const startX = corner.includes('right') ? width - zoneWidth : 0
  const startY = corner.includes('bottom') ? height - zoneHeight : 0

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let darkPixels = 0

  for (let y = startY; y < startY + zoneHeight; y += 1) {
    for (let x = startX; x < startX + zoneWidth; x += 1) {
      const v = grayscalePixel(image.getPixelColor(x, y))
      if (v >= 90) continue

      darkPixels += 1
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (darkPixels < 30 || minX >= maxX || minY >= maxY) return null

  const markerWidth = maxX - minX + 1
  const markerHeight = maxY - minY + 1
  const maxMarkerWidth = Math.max(24, width * 0.08)
  const maxMarkerHeight = Math.max(24, height * 0.08)

  if (markerWidth > maxMarkerWidth || markerHeight > maxMarkerHeight) return null

  return { x: minX, y: minY, width: markerWidth, height: markerHeight }
}

function detectStructuralBoundingBox(image: Jimp): BoundingBox | null {
  const { width, height } = image.bitmap
  const topLeft = detectCornerMarker(image, 'top-left')
  const topRight = detectCornerMarker(image, 'top-right')
  const bottomLeft = detectCornerMarker(image, 'bottom-left')
  const bottomRight = detectCornerMarker(image, 'bottom-right')

  if (!topLeft || !topRight || !bottomLeft || !bottomRight) return null

  const markerBoxes = [topLeft, topRight, bottomLeft, bottomRight]
  const minX = Math.min(...markerBoxes.map((box) => box.x))
  const minY = Math.min(...markerBoxes.map((box) => box.y))
  const maxX = Math.max(...markerBoxes.map((box) => box.x + box.width))
  const maxY = Math.max(...markerBoxes.map((box) => box.y + box.height))
  const detectedWidth = maxX - minX
  const detectedHeight = maxY - minY
  const aspectRatio = detectedWidth / detectedHeight

  if (detectedWidth < width * 0.6 || detectedHeight < height * 0.6) return null
  if (aspectRatio < 0.55 || aspectRatio > 0.9) return null

  const padding = 8
  return normalizeBox(
    {
      x: minX - padding,
      y: minY - padding,
      width: detectedWidth + padding * 2,
      height: detectedHeight + padding * 2,
    },
    width,
    height,
  )
}

function fallbackContentBoundingBox(image: Jimp): BoundingBox | null {
  const { width, height } = image.bitmap
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const v = grayscalePixel(image.getPixelColor(x, y))
      if (v < 140) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (minX >= maxX || minY >= maxY) return null

  const padding = 10
  return normalizeBox(
    {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    },
    width,
    height,
  )
}

function normalizeContent(image: Jimp, originalWidth: number, originalHeight: number, useFallback = true): CropResult {
  const { width, height } = image.bitmap
  const structuralBox = detectStructuralBoundingBox(image)

  if (structuralBox) {
    const normalized = cropApplied(structuralBox, width, height) ? applyNormalizedCrop(image, structuralBox) : image.clone()
    return {
      image: normalized,
      metadata: {
        boundingBoxDetected: true,
        cropApplied: cropApplied(structuralBox, width, height),
        cropFallbackUsed: false,
        originalWidth,
        originalHeight,
        processedWidth: normalized.bitmap.width,
        processedHeight: normalized.bitmap.height,
      },
    }
  }

  if (!useFallback) {
    return {
      image: image.clone(),
      metadata: {
        boundingBoxDetected: false,
        cropApplied: false,
        cropFallbackUsed: false,
        originalWidth,
        originalHeight,
        processedWidth: image.bitmap.width,
        processedHeight: image.bitmap.height,
      },
    }
  }

  const fallbackBox = fallbackContentBoundingBox(image)
  if (fallbackBox) {
    const normalized = applyNormalizedCrop(image, fallbackBox)
    return {
      image: normalized,
      metadata: {
        boundingBoxDetected: false,
        cropApplied: cropApplied(fallbackBox, width, height),
        cropFallbackUsed: true,
        originalWidth,
        originalHeight,
        processedWidth: normalized.bitmap.width,
        processedHeight: normalized.bitmap.height,
      },
    }
  }

  return {
    image: image.clone(),
    metadata: {
      boundingBoxDetected: false,
      cropApplied: false,
      cropFallbackUsed: true,
      originalWidth,
      originalHeight,
      processedWidth: image.bitmap.width,
      processedHeight: image.bitmap.height,
    },
  }
}

export async function preprocessImage(imagePath: string): Promise<PreprocessedImage> {
  const loaded = await Jimp.read(imagePath)
  const originalWidth = loaded.bitmap.width
  const originalHeight = loaded.bitmap.height
  const gray = loaded.greyscale().normalize().contrast(0.22)
  const structural = normalizeContent(gray, originalWidth, originalHeight, false)
  const rotated = autoRotateLight(structural.metadata.boundingBoxDetected ? structural.image : gray)
  const normalized = structural.metadata.boundingBoxDetected
    ? {
        image: rotated.image,
        metadata: {
          ...structural.metadata,
          processedWidth: rotated.image.bitmap.width,
          processedHeight: rotated.image.bitmap.height,
        },
      }
    : normalizeContent(rotated.image, originalWidth, originalHeight)
  const normalizedImage = normalized.image

  const threshold = otsuThreshold(normalizedImage)

  normalizedImage.scan(0, 0, normalizedImage.bitmap.width, normalizedImage.bitmap.height, function apply(_x, _y, idx) {
    const value = grayscaleByte(this.bitmap.data[idx] ?? 0)
    const binary = value < threshold ? 0 : 255
    this.bitmap.data[idx] = binary
    this.bitmap.data[idx + 1] = binary
    this.bitmap.data[idx + 2] = binary
  })

  return {
    image: normalizedImage,
    width: normalizedImage.bitmap.width,
    height: normalizedImage.bitmap.height,
    binarizationThreshold: threshold,
    autoRotationAngle: rotated.angle,
    rotationCandidates: rotated.candidates,
    rotationConfidence: rotated.confidence,
    ...normalized.metadata,
  }
}
