import type { CardTemplateDefinition, OMRTemplateConfig } from '../types/omr'
import { normalizeOptionLabels } from './optionLabels'
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
  layoutDefinition?: Pick<CardTemplateDefinition, 'bubbleSize' | 'rowSpacing' | 'columnGap' | 'optionAlignment' | 'columnLayoutMode' | 'optionLabels' | 'choicesPerQuestion'>,
  layoutArea?: { left: number; right: number },
  questionNumberOffset = 0,
  pageQuestionCount = config.totalQuestions,
  layoutOverrides?: { rowOffset?: number },
) {
  const contentX = TEMPLATE_PAGE_X
  const contentY = TEMPLATE_PAGE_Y
  const contentWidth = TEMPLATE_PAGE_WIDTH
  const contentHeight = TEMPLATE_PAGE_HEIGHT
  const bubbleSize = layoutDefinition?.bubbleSize ?? 'large'
  const bubbleScale = bubbleSize === 'small' ? 0.76 : bubbleSize === 'medium' ? 0.88 : 1
  const extraColumnGap = layoutDefinition?.columnGap ?? 8
  const optionAlignment = layoutDefinition?.optionAlignment ?? 'auto'
  const columnLayoutMode = layoutDefinition?.columnLayoutMode ?? 'left'
  const areaLeft = layoutArea?.left ?? contentX + contentWidth * 0.12
  const areaRight = layoutArea?.right ?? contentX + contentWidth * 0.88
  const availableWidth = Math.max(80, areaRight - areaLeft)
  const bubbleRadius = contentWidth * clampLayoutRatio(config.bubbleRadiusRatio, 0.005, 0.03) * bubbleScale
  const capacity = config.columns * config.rowsPerColumn
  const safeChoicesPerQuestion =
    config.choicesPerQuestion === 2 || config.choicesPerQuestion === 3 || config.choicesPerQuestion === 4
      ? config.choicesPerQuestion
      : 5
  const activeOptions = normalizeOptionLabels(layoutDefinition?.optionLabels, safeChoicesPerQuestion)
  const bubbleDiameter = bubbleRadius * 2
  const opticalTightening = bubbleSize === 'small' ? 0.84 : bubbleSize === 'medium' ? 0.92 : 1
  const requestedOptionCenterStep =
    contentWidth * clampLayoutRatio(config.optionGapRatio, 0.01, 0.12) * 0.66 * opticalTightening
  const minimumOpticalGap = bubbleSize === 'small' ? 1.1 : bubbleSize === 'medium' ? 1.4 : 1.8
  const optionCenterStep = Math.max(bubbleDiameter + minimumOpticalGap, requestedOptionCenterStep)
  const optionGapX = Math.max(2.4, optionCenterStep - bubbleDiameter)
  const optionGroupWidth = optionCenterStep * Math.max(0, activeOptions.length - 1) + bubbleDiameter
  const questionNumberMinWidth = 28
  const questionLabelWidth = questionNumberMinWidth
  const questionLabelGap = 9
  const rowVisualWidth = questionLabelWidth + questionLabelGap + optionGroupWidth
  const maxColumnGapThatFits =
    config.columns > 1 ? Math.max(10, (availableWidth - rowVisualWidth * config.columns) / Math.max(1, config.columns - 1)) : 0
  const requestedColumnGap = 8 + extraColumnGap
  const leftColumnGap =
    config.columns > 1
      ? Math.min(requestedColumnGap, maxColumnGapThatFits)
      : 0
  const groupedColumnsWidth = rowVisualWidth * config.columns + leftColumnGap * Math.max(0, config.columns - 1)
  const distributedSlack =
    columnLayoutMode === 'distributed' && config.columns > 1
      ? Math.max(0, availableWidth - groupedColumnsWidth)
      : 0
  const distributedColumnGap =
    config.columns > 1 ? leftColumnGap + distributedSlack / Math.max(1, config.columns - 1) : 0
  const activeColumnGap = columnLayoutMode === 'distributed' ? distributedColumnGap : leftColumnGap
  const columnRowStartXs = Array.from({ length: config.columns }, (_, columnIndex) => {
    if (columnLayoutMode === 'distributed' && config.columns > 1) {
      return areaLeft + columnIndex * (rowVisualWidth + distributedColumnGap)
    }

    return areaLeft + columnIndex * (rowVisualWidth + leftColumnGap)
  })
  const columnQuestionStartXs = columnRowStartXs.map(
    (rowStartX) => rowStartX + questionLabelWidth + questionLabelGap + bubbleRadius,
  )
  const questionStartX = columnQuestionStartXs[0] ?? areaLeft + questionLabelWidth + questionLabelGap + bubbleRadius
  const questionStartY = contentY + contentHeight * clampLayoutRatio(config.startYRatio, 0.12, 0.75)
  const justifyColumnGap =
    config.columns > 1 ? Math.max(activeColumnGap, (availableWidth - rowVisualWidth * config.columns) / (config.columns - 1)) : 0
  const columnOffset =
    columnQuestionStartXs.length > 1
      ? columnQuestionStartXs[1] - columnQuestionStartXs[0]
      : rowVisualWidth + (optionAlignment === 'justify' ? justifyColumnGap : activeColumnGap)
  const compactClearance = 2.8
  const uniformClearance = 12.5
  const configuredClearance =
    contentHeight *
    clampLayoutRatio(config.rowGapRatio, 0.012, 0.2) *
    (layoutDefinition?.rowSpacing === 'uniform' ? 0.08 : 0.035)
  const preferredRowOffset =
    bubbleDiameter +
    (layoutDefinition?.rowSpacing === 'uniform' ? uniformClearance : compactClearance) +
    configuredClearance
  const rowOffset = layoutOverrides?.rowOffset ?? preferredRowOffset
  const headerY = questionStartY - rowOffset * 0.8
  const answerBlockWidth = optionGroupWidth

  const questions = Array.from({ length: pageQuestionCount }, (_, index) => {
    const questionNumber = questionNumberOffset + index + 1
    const columnIndex = Math.floor(index / config.rowsPerColumn)
    const rowIndex = index % config.rowsPerColumn
    const baseX = columnQuestionStartXs[columnIndex] ?? questionStartX
    const baseY = questionStartY + rowIndex * rowOffset
    const optionSpacing = optionCenterStep
    const questionRowWidth = questionLabelWidth + questionLabelGap + optionGroupWidth
    const rowStartX = columnRowStartXs[columnIndex] ?? (baseX - (questionLabelWidth + questionLabelGap + bubbleRadius))

    return {
      questionNumber,
      columnIndex,
      rowIndex,
      labelX: rowStartX + questionLabelWidth,
      labelY: baseY,
      optionStartX: rowStartX + questionLabelWidth + questionLabelGap + bubbleRadius,
      optionSpacing,
      optionGroupWidth,
      rowStartX,
      rowWidth: questionRowWidth,
      optionY: baseY,
    }
  })

  return {
    contentX,
    contentY,
    contentWidth,
    contentHeight,
    activeOptions,
    bubbleSpacing: optionCenterStep,
    bubbleRadius,
    bubbleDiameter,
    optionGapX,
    capacity,
    answerBlockWidth,
    rowWidth: rowVisualWidth,
    questionLabelOffset: questionLabelWidth,
    questionLabelWidth,
    questionLabelGap,
    questionNumberMinWidth,
    questionStartX,
    questionStartY,
    columnRowStartXs,
    columnQuestionStartXs,
    columnOffset,
    columnGap: optionAlignment === 'justify' ? justifyColumnGap : activeColumnGap,
    preferredRowOffset,
    rowOffset,
    headerY,
    questions,
  }
}
