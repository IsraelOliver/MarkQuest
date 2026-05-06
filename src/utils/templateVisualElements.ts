import { estimateTextWidth } from './templateRenderMetrics'
import type { TemplateImageLayout, TemplateMathLayout } from './templatePageLayout'

type QuestionMarkerLayoutInput = {
  markerLabel: string
  questionFontSize: number
  optionGroupWidth: number
  optionStartX: number
  optionY: number
  bubbleRadius: number
  bubbleStrokeWidth: number
  bubbleLabelOffsetY: number
}

export function getQuestionMarkerLayout({
  markerLabel,
  questionFontSize,
  optionGroupWidth,
  optionStartX,
  optionY,
  bubbleRadius,
  bubbleStrokeWidth,
}: QuestionMarkerLayoutInput) {
  const fontSize = Math.max(questionFontSize - 0.3, 8.3)
  const textWidth = estimateTextWidth(markerLabel, fontSize, 'bold')
  const paddingX = 8
  const height = Math.max(bubbleRadius * 2 + 2, 16)
  const width = Math.min(optionGroupWidth, textWidth + paddingX * 2)
  const x = optionStartX - bubbleRadius
  const y = optionY - height / 2
  const opticalTextOffsetY = 1
  const textCenterY = y + height / 2 + opticalTextOffsetY

  return {
    x,
    y,
    width,
    height,
    radius: Math.max(bubbleRadius + 1, 7),
    textX: x + width / 2,
    textY: textCenterY,
    textCenterY,
    fontSize,
    strokeWidth: Math.max(bubbleStrokeWidth - 0.1, 0.9),
  }
}

export const mathInputBoxStyle = {
  radius: 4,
  strokeWidth: 0.9,
  strokeColor: '#d5dee9',
  fillColor: '#ffffff',
}

export const mathBubbleStyle = {
  fillColor: '#ffffff',
  strokeColor: '#0f172a',
  labelColor: '#475569',
  labelWeight: 700,
}

export function getMathInputBoxLayouts(mathBlock: Pick<TemplateMathLayout, 'columnXs' | 'inputBoxWidth' | 'inputBoxHeight' | 'topInputY'>) {
  return mathBlock.columnXs.map((columnX) => ({
    x: Math.round(columnX - mathBlock.inputBoxWidth / 2),
    y: Math.round(mathBlock.topInputY - mathBlock.inputBoxHeight / 2),
    width: mathBlock.inputBoxWidth,
    height: mathBlock.inputBoxHeight,
    radius: mathInputBoxStyle.radius,
  }))
}

export function getMathBubbleLayouts(
  mathBlock: Pick<TemplateMathLayout, 'columnXs' | 'rows' | 'bubbleRadius'>,
  renderMetrics: { bubbleLabelOffsetY: number; bubbleLabelFontSize: number; bubbleStrokeWidthPreview: number },
) {
  return mathBlock.rows.flatMap((row) =>
    mathBlock.columnXs.map((columnX) => ({
      symbol: row.symbol,
      cx: columnX,
      cy: row.y,
      radius: mathBlock.bubbleRadius,
      labelX: columnX,
      labelY: row.y + renderMetrics.bubbleLabelOffsetY,
      labelFontSize: renderMetrics.bubbleLabelFontSize,
      strokeWidth: renderMetrics.bubbleStrokeWidthPreview,
    })),
  )
}

export function getContainedImageLayout(
  imageSection: Pick<TemplateImageLayout, 'x' | 'imageBoxY' | 'width' | 'imageBoxHeight' | 'imageWidth' | 'imageHeight'>,
) {
  const naturalWidth = imageSection.imageWidth ?? imageSection.width
  const naturalHeight = imageSection.imageHeight ?? imageSection.imageBoxHeight
  const scale = Math.min(imageSection.width / Math.max(naturalWidth, 1), imageSection.imageBoxHeight / Math.max(naturalHeight, 1))
  const width = naturalWidth * scale
  const height = naturalHeight * scale

  return {
    x: imageSection.x + (imageSection.width - width) / 2,
    y: imageSection.imageBoxY + (imageSection.imageBoxHeight - height) / 2,
    width,
    height,
  }
}

export const imagePlaceholderStyle = {
  radius: 8,
  fillColor: '#f8fafc',
  strokeColor: '#cbd5e1',
  strokeDashArray: '6 4',
  labelColor: '#64748b',
  labelFontSize: 11,
}
