import type { CardTemplateDefinition } from '../types/omr'

export function clampLogoScale(scale: number) {
  return Math.min(1.2, Math.max(0.6, scale))
}

export function getLogoBoxPlacement(
  header: CardTemplateDefinition['header'],
  box: { x: number; y: number; width: number; height: number },
) {
  const scale = clampLogoScale(header.logoScale)
  const width = box.width * scale
  const height = box.height * scale
  const y = box.y + (box.height - height) / 2

  let x = box.x
  if (header.logoAlignment === 'center') x = box.x + (box.width - width) / 2
  if (header.logoAlignment === 'right') x = box.x + (box.width - width)

  return { x, y, width, height }
}
