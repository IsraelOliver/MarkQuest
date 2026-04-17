import type { getTemplateLayoutMetrics } from './templateLayoutGeometry'

type LayoutMetrics = ReturnType<typeof getTemplateLayoutMetrics>

export function estimateTextWidth(text: string, fontSize: number, weight: 'regular' | 'bold' = 'regular') {
  const factor = weight === 'bold' ? 0.58 : 0.54
  return text.length * fontSize * factor
}

export function getTemplateRenderMetrics(_metrics: LayoutMetrics) {
  return {
    instructionFontSize: 8,
    instructionOffsetY: 14,
    blockTitleFontSize: 9.2,
    blockTitleOffsetY: 3.2,
    blockTitlePaddingX: 8,
    blockTitleRuleOffsetY: 6,
    questionFontSize: 8.6,
    questionOffsetY: 3,
    bubbleLabelFontSize: 5.8,
    bubbleLabelOffsetY: 2.1,
    bubbleStrokeWidthPreview: 1.35,
    bubbleStrokeWidthPdf: 1.05,
    fieldLabelFontSize: 10,
    footerMetaFontSize: 7,
    fieldValueFontSize: 9,
    fieldValueOffsetX: 54,
    previewQrSize: 92,
    previewQrTop: 26,
    cardIdFontSize: 8,
    signatureLabelFontSize: 9,
  }
}

export function getLabelTextFontSize(size: 'sm' | 'md' | 'lg') {
  if (size === 'sm') return 10
  if (size === 'lg') return 15
  return 12
}
