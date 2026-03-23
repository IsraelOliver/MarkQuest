import type { OMRTemplateConfig } from '../types/omr'

export const TEMPLATE_OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const
export const TEMPLATE_VIEWBOX_WIDTH = 595.28
export const TEMPLATE_VIEWBOX_HEIGHT = 841.89
export const TEMPLATE_PAGE_X = 0
export const TEMPLATE_PAGE_Y = 0
export const TEMPLATE_PAGE_WIDTH = 595.28
export const TEMPLATE_PAGE_HEIGHT = 841.89
export const TEMPLATE_SAFE_MARGIN = 28.35
export const TEMPLATE_TECHNICAL_FOOTER_HEIGHT = 96
export const TEMPLATE_TECHNICAL_FOOTER_GAP = 20

export function clampLayoutRatio(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function getTemplateLayoutMetrics(
  config: OMRTemplateConfig,
  questionNumberOffset = 0,
  pageQuestionCount = config.totalQuestions,
) {
  const contentX = TEMPLATE_PAGE_X
  const contentY = TEMPLATE_PAGE_Y
  const contentWidth = TEMPLATE_PAGE_WIDTH
  const contentHeight = TEMPLATE_PAGE_HEIGHT
  const bubbleSpacing = contentWidth * clampLayoutRatio(config.optionGapRatio, 0.01, 0.12)
  const bubbleRadius = contentWidth * clampLayoutRatio(config.bubbleRadiusRatio, 0.005, 0.03)
  const capacity = config.columns * config.rowsPerColumn
  const activeOptions = TEMPLATE_OPTIONS.slice(0, config.choicesPerQuestion)
  const answerBlockWidth = bubbleSpacing * (activeOptions.length - 1)
  const questionLabelOffset = 56
  const questionLabelWidth = 32
  const questionStartX = contentX + contentWidth * clampLayoutRatio(config.startXRatio, 0.08, 0.7)
  const questionStartY = contentY + contentHeight * clampLayoutRatio(config.startYRatio, 0.12, 0.75)
  const columnOffset = contentWidth * clampLayoutRatio(config.columnGapRatio, 0.1, 0.9)
  const rowOffset = contentHeight * clampLayoutRatio(config.rowGapRatio, 0.012, 0.2)
  const headerY = questionStartY - rowOffset * 0.8

  const questions = Array.from({ length: pageQuestionCount }, (_, index) => {
    const questionNumber = questionNumberOffset + index + 1
    const columnIndex = Math.floor(index / config.rowsPerColumn)
    const rowIndex = index % config.rowsPerColumn
    const baseX = questionStartX + columnIndex * columnOffset
    const baseY = questionStartY + rowIndex * rowOffset

    return {
      questionNumber,
      columnIndex,
      rowIndex,
      labelX: baseX - questionLabelOffset,
      labelY: baseY,
      optionStartX: baseX,
      optionY: baseY,
    }
  })

  return {
    contentX,
    contentY,
    contentWidth,
    contentHeight,
    activeOptions,
    bubbleSpacing,
    bubbleRadius,
    capacity,
    answerBlockWidth,
    questionLabelOffset,
    questionLabelWidth,
    questionStartX,
    questionStartY,
    columnOffset,
    rowOffset,
    headerY,
    questions,
  }
}
