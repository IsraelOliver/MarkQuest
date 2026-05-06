import Jimp from 'jimp'
import type { BubbleOption } from '../../types/entities.js'

export const DEFAULT_SPATIAL_TOLERANCE_PX = 4

function grayscaleIntensity(pixel: number): number {
  return Jimp.intToRGBA(pixel).r
}

export function getBubbleFillRatio(
  image: Jimp,
  centerX: number,
  centerY: number,
  radius: number,
): number {
  const xMin = Math.max(0, Math.floor(centerX - radius))
  const xMax = Math.min(image.bitmap.width - 1, Math.ceil(centerX + radius))
  const yMin = Math.max(0, Math.floor(centerY - radius))
  const yMax = Math.min(image.bitmap.height - 1, Math.ceil(centerY + radius))

  let blackPixels = 0
  let sampledPixels = 0

  for (let y = yMin; y <= yMax; y += 1) {
    for (let x = xMin; x <= xMax; x += 1) {
      const dx = x - centerX
      const dy = y - centerY
      if (dx * dx + dy * dy > radius * radius) continue

      const pixel = image.getPixelColor(x, y)
      const intensity = grayscaleIntensity(pixel)
      sampledPixels += 1
      if (intensity < 128) blackPixels += 1
    }
  }

  if (sampledPixels === 0) return 0
  return blackPixels / sampledPixels
}

export function getBestBubbleFillRatio(
  image: Jimp,
  centerX: number,
  centerY: number,
  radius: number,
  tolerancePx = DEFAULT_SPATIAL_TOLERANCE_PX,
): {
  fillRatio: number
  offsetX: number
  offsetY: number
  displacement: number
} {
  const tolerance = Math.max(0, Math.floor(tolerancePx))
  let bestFillRatio = -1
  let bestOffsetX = 0
  let bestOffsetY = 0

  for (let offsetY = -tolerance; offsetY <= tolerance; offsetY += 1) {
    for (let offsetX = -tolerance; offsetX <= tolerance; offsetX += 1) {
      const fillRatio = getBubbleFillRatio(image, centerX + offsetX, centerY + offsetY, radius)
      if (fillRatio <= bestFillRatio) continue

      bestFillRatio = fillRatio
      bestOffsetX = offsetX
      bestOffsetY = offsetY
    }
  }

  return {
    fillRatio: Math.max(0, bestFillRatio),
    offsetX: bestOffsetX,
    offsetY: bestOffsetY,
    displacement: Math.hypot(bestOffsetX, bestOffsetY),
  }
}

export function detectMarkedOption(
  fillByOption: Record<BubbleOption, number>,
  markThreshold: number,
  ambiguityThreshold: number,
): {
  status: 'marked' | 'blank' | 'multiple'
  selectedOption: BubbleOption | null
  confidence: number
} {
  const sorted = Object.entries(fillByOption).sort((a, b) => b[1] - a[1])
  const [topOption, topScore] = sorted[0] as [BubbleOption, number]
  const secondScore = sorted[1]?.[1] ?? 0

  if (topScore < markThreshold) {
    return { status: 'blank', selectedOption: null, confidence: 1 - topScore }
  }

  if (topScore - secondScore < ambiguityThreshold) {
    return { status: 'multiple', selectedOption: null, confidence: topScore }
  }

  return {
    status: 'marked',
    selectedOption: topOption,
    confidence: Math.max(0.05, Math.min(1, topScore - secondScore + 0.4)),
  }
}
