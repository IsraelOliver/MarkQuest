import type { CardTemplateSection, Template } from '../../types/entities.js'
import type { MathGridImageGeometry } from './math-grid-reader.js'

const TEMPLATE_PAGE_WIDTH = 595.28
const TEMPLATE_PAGE_HEIGHT = 841.89
const TEMPLATE_SAFE_MARGIN = 28.35
const TEMPLATE_TECHNICAL_FOOTER_HEIGHT = 96
const TEMPLATE_TECHNICAL_FOOTER_GAP = 20
const MAX_MATH_BLOCKS_PER_ROW = 6
const MATH_BLOCK_HORIZONTAL_GAP = 16

function clampLayoutRatio(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function getIdentificationFieldCount(template: Template) {
  const { identification } = template.definition
  return [
    identification.showStudentName,
    identification.showStudentCode,
    identification.showClassroom,
    identification.showDate,
    identification.showExamCode,
    identification.showSignature,
    ...identification.extraFields.map(() => true),
  ].filter(Boolean).length
}

function getAnswerLayoutArea(template: Template) {
  const safeLeft = TEMPLATE_SAFE_MARGIN
  const safeTop = TEMPLATE_SAFE_MARGIN
  const safeRight = TEMPLATE_PAGE_WIDTH - TEMPLATE_SAFE_MARGIN
  const safeBottom = TEMPLATE_PAGE_HEIGHT - TEMPLATE_SAFE_MARGIN
  const infoColumns = getIdentificationFieldCount(template) > 4 ? 3 : 2
  const infoRows = Math.max(1, Math.ceil(Math.max(getIdentificationFieldCount(template), 1) / infoColumns))
  const infoHeight = 18 + infoRows * 20
  const instructionHeight = template.definition.header.showInstructions ? 24 : 0
  const instructionsY = safeTop + infoHeight + 14
  const answersTop = instructionsY + instructionHeight + (template.definition.header.showInstructions ? 24 : 14)
  const footerTop = safeBottom - TEMPLATE_TECHNICAL_FOOTER_HEIGHT

  return {
    left: safeLeft + 2,
    right: safeRight - 2,
    top: answersTop,
    bottom: footerTop - TEMPLATE_TECHNICAL_FOOTER_GAP,
    pageWidth: TEMPLATE_PAGE_WIDTH,
    pageHeight: TEMPLATE_PAGE_HEIGHT,
  }
}

function getTemplateLayoutMetricsLike(template: Template, layoutArea: { left: number; right: number }) {
  const config = template.omrConfig
  const definition = template.definition
  const contentWidth = TEMPLATE_PAGE_WIDTH
  const contentHeight = TEMPLATE_PAGE_HEIGHT
  const bubbleSize = definition.bubbleSize ?? 'large'
  const bubbleScale = bubbleSize === 'small' ? 0.76 : bubbleSize === 'medium' ? 0.88 : 1
  const extraColumnGap = definition.columnGap ?? 8
  const columnLayoutMode = definition.columnLayoutMode ?? 'left'
  const availableWidth = Math.max(80, layoutArea.right - layoutArea.left)
  const bubbleRadius = contentWidth * clampLayoutRatio(config.bubbleRadiusRatio, 0.005, 0.03) * bubbleScale
  const safeChoicesPerQuestion =
    config.choicesPerQuestion === 2 || config.choicesPerQuestion === 3 || config.choicesPerQuestion === 4
      ? config.choicesPerQuestion
      : 5
  const bubbleDiameter = bubbleRadius * 2
  const opticalTightening = bubbleSize === 'small' ? 0.84 : bubbleSize === 'medium' ? 0.92 : 1
  const requestedOptionCenterStep =
    contentWidth * clampLayoutRatio(config.optionGapRatio, 0.01, 0.12) * 0.66 * opticalTightening
  const minimumOpticalGap = bubbleSize === 'small' ? 1.1 : bubbleSize === 'medium' ? 1.4 : 1.8
  const optionCenterStep = Math.max(bubbleDiameter + minimumOpticalGap, requestedOptionCenterStep)
  const optionLabels = definition.optionLabels.length > 0 ? definition.optionLabels : ['A', 'B', 'C', 'D', 'E']
  const optionGroupWidth = optionCenterStep * Math.max(0, optionLabels.slice(0, safeChoicesPerQuestion).length - 1) + bubbleDiameter
  const questionLabelWidth = 28
  const questionLabelGap = 9
  const rowVisualWidth = questionLabelWidth + questionLabelGap + optionGroupWidth
  const maxColumnGapThatFits =
    config.columns > 1 ? Math.max(10, (availableWidth - rowVisualWidth * config.columns) / Math.max(1, config.columns - 1)) : 0
  const requestedColumnGap = 8 + extraColumnGap
  const leftColumnGap = config.columns > 1 ? Math.min(requestedColumnGap, maxColumnGapThatFits) : 0
  const groupedColumnsWidth = rowVisualWidth * config.columns + leftColumnGap * Math.max(0, config.columns - 1)
  const distributedSlack =
    columnLayoutMode === 'distributed' && config.columns > 1 ? Math.max(0, availableWidth - groupedColumnsWidth) : 0
  const distributedColumnGap =
    config.columns > 1 ? leftColumnGap + distributedSlack / Math.max(1, config.columns - 1) : 0
  const activeColumnGap = columnLayoutMode === 'distributed' ? distributedColumnGap : leftColumnGap
  const compactClearance = 2.8
  const uniformClearance = 12.5
  const configuredClearance =
    contentHeight *
    clampLayoutRatio(config.rowGapRatio, 0.012, 0.2) *
    (definition.rowSpacing === 'uniform' ? 0.08 : 0.035)
  const rowOffset = bubbleDiameter + (definition.rowSpacing === 'uniform' ? uniformClearance : compactClearance) + configuredClearance

  return {
    bubbleRadius,
    bubbleSpacing: optionCenterStep,
    rowOffset,
    columnGap: activeColumnGap,
  }
}

function getLabelSectionMetrics(rowOffset: number) {
  return {
    topGap: Math.max(16, rowOffset * 0.7),
    height: Math.max(22, rowOffset * 0.9),
    afterGap: Math.max(10, rowOffset * 0.44),
    totalHeight: Math.max(16, rowOffset * 0.7) + Math.max(22, rowOffset * 0.9),
  }
}

function getSpacerSectionHeight(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return 8
    case 'lg':
      return 24
    default:
      return 16
  }
}

function getSignatureSectionMetrics(rowOffset: number) {
  return {
    totalHeight: Math.max(22, rowOffset * 0.78) + Math.max(12, rowOffset * 0.36) + 12,
    afterGap: Math.max(12, rowOffset * 0.42),
  }
}

function getOpenAnswerSectionMetrics(rowOffset: number, lines: number) {
  const safeLines = Math.min(20, Math.max(1, Math.round(lines)))
  const topGap = Math.max(16, rowOffset * 0.58)
  const labelHeight = 14
  const labelToAnswerGap = Math.max(10, rowOffset * 0.34)
  const lineSpacing = Math.max(16, Math.min(22, rowOffset * 0.72))
  const answerHeight = safeLines * lineSpacing
  const afterGap = Math.max(12, rowOffset * 0.42)
  return {
    totalHeight: topGap + labelHeight + labelToAnswerGap + answerHeight,
    afterGap,
  }
}

function getImageSectionMetrics(rowOffset: number, displayQuestionNumber: number | null, imageHeight: number) {
  const topGap = Math.max(14, rowOffset * 0.56)
  const titleHeight = displayQuestionNumber ? 14 : 0
  const titleGap = displayQuestionNumber ? 7 : 0
  const imageBoxHeight = Math.max(36, imageHeight)
  const afterGap = Math.max(12, rowOffset * 0.42)
  return {
    totalHeight: topGap + titleHeight + titleGap + imageBoxHeight,
    afterGap,
  }
}

function getMathColumns(value: number) {
  return Math.min(10, Math.max(1, Math.round(value)))
}

function getMathSectionMetrics(
  rowOffset: number,
  columns: number,
  rowSymbols: string[],
  showTopInputRow: boolean,
  showColumnHeaders: boolean,
  displayQuestionNumber: number | null,
  sharedBubbleRadius: number,
  sharedBubbleSpacing: number,
) {
  const symbolCount = rowSymbols.length
  const safeColumns = getMathColumns(columns)
  const topGap = Math.max(18, rowOffset * 0.66)
  const titleHeight = displayQuestionNumber ? 12 : 0
  const titleToContentGap = displayQuestionNumber ? 7 : 0
  const compactVerticalGap = Math.max(6, Math.min(8, rowOffset * 0.24))
  const headerHeight = showColumnHeaders ? 12 : 0
  const headerToInputGap = showColumnHeaders && showTopInputRow ? Math.max(4, compactVerticalGap - 1) : 0
  const headerToGridGap = showColumnHeaders && !showTopInputRow ? compactVerticalGap : 0
  const inputHeight = showTopInputRow ? 16 : 0
  const inputToGridGap = showTopInputRow ? Math.max(4, compactVerticalGap - 3) : 0
  const rowSpacing = rowOffset
  const gridHeight = symbolCount * rowSpacing
  const afterGap = Math.max(12, rowOffset * 0.42)
  const bubbleRadius = sharedBubbleRadius
  const bubbleDiameter = bubbleRadius * 2
  const inputBoxSize = Math.max(16, Math.round(bubbleDiameter + 5))
  const leftPadding = 4
  const rightPadding = 8
  const columnSpacing = Math.round(sharedBubbleSpacing)
  const gridWidth = safeColumns === 1 ? bubbleDiameter : bubbleDiameter + (safeColumns - 1) * columnSpacing

  return {
    safeColumns,
    topGap,
    titleHeight,
    titleToContentGap,
    headerHeight,
    headerToInputGap,
    headerToGridGap,
    inputHeight,
    inputToGridGap,
    rowSpacing,
    gridHeight,
    afterGap,
    bubbleRadius,
    inputBoxWidth: inputBoxSize,
    inputBoxHeight: inputBoxSize,
    leftPadding,
    rightPadding,
    columnSpacing,
    gridWidth,
    totalHeight:
      topGap +
      titleHeight +
      titleToContentGap +
      headerHeight +
      headerToInputGap +
      headerToGridGap +
      inputHeight +
      inputToGridGap +
      gridHeight,
  }
}

function getMathRowSymbolsFromBlock(mathBlock: Extract<CardTemplateSection, { sectionType: 'math' }>) {
  const separators = mathBlock.columnSeparators.filter((symbol) => symbol === '-' || symbol === ',' || symbol === '.')
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  return [...separators, ...digits]
}

function getSectionDisplayQuestionNumber(section: CardTemplateSection) {
  if ('linkedQuestionNumber' in section && typeof section.linkedQuestionNumber === 'number') {
    return section.linkedQuestionNumber
  }
  return null
}

function scaleDerivedGeometry(params: {
  pageWidth: number
  pageHeight: number
  rasterizedWidth: number
  rasterizedHeight: number
  geometry: MathGridImageGeometry
}) {
  const scaleX = params.rasterizedWidth / params.pageWidth
  const scaleY = params.rasterizedHeight / params.pageHeight
  const scaled: MathGridImageGeometry = {
    ...params.geometry,
    startX: Math.round(params.geometry.startX * scaleX),
    startY: Math.round(params.geometry.startY * scaleY),
    columnGap: Math.round(params.geometry.columnGap * scaleX),
    rowGap: Math.round(params.geometry.rowGap * scaleY),
    bubbleRadius: Math.max(4, Math.round(params.geometry.bubbleRadius * scaleX)),
  }

  const isValid =
    scaled.startX >= 0 &&
    scaled.startY >= 0 &&
    scaled.columnGap >= 0 &&
    scaled.rowGap >= 0 &&
    scaled.bubbleRadius > 0 &&
    scaled.rowSymbols.length > 0

  return isValid ? scaled : null
}

export function deriveMathOperationalGeometryInRuntime(params: {
  template: Template
  pageBlocks: CardTemplateSection[]
  mathBlockId: string
  rasterizedPage: {
    width: number
    height: number
    pageNumber: number
  }
}): MathGridImageGeometry | null {
  const layoutArea = getAnswerLayoutArea(params.template)
  const layoutMetrics = getTemplateLayoutMetricsLike(params.template, layoutArea)
  const pageBottomY = layoutArea.bottom
  let currentY = layoutArea.top
  let pendingMathRow: Array<{
    section: Extract<CardTemplateSection, { sectionType: 'math' }>
    metrics: ReturnType<typeof getMathSectionMetrics>
    blockWidth: number
  }> = []
  let derivedGeometry: MathGridImageGeometry | null = null

  const flushPendingMathRow = () => {
    if (!pendingMathRow.length || derivedGeometry) {
      pendingMathRow = []
      return
    }

    const availableWidth = layoutArea.right - layoutArea.left
    const totalBlocksWidth = pendingMathRow.reduce((total, item) => total + item.blockWidth, 0)
    const gapCount = Math.max(0, pendingMathRow.length - 1)
    const distributedGap = gapCount > 0 ? Math.max(MATH_BLOCK_HORIZONTAL_GAP, (availableWidth - totalBlocksWidth) / gapCount) : 0
    let cursorX = layoutArea.left

    pendingMathRow.forEach((item) => {
      if (derivedGeometry || item.section.id !== params.mathBlockId) {
        cursorX += item.blockWidth + distributedGap
        return
      }

      const sectionY = currentY + item.metrics.topGap
      const contentTopY = sectionY + item.metrics.titleHeight + item.metrics.titleToContentGap
      const gridLeftX = cursorX + item.metrics.leftPadding + item.metrics.bubbleRadius
      const gridTopY =
        contentTopY +
        item.metrics.headerHeight +
        item.metrics.headerToInputGap +
        item.metrics.headerToGridGap +
        item.metrics.inputHeight +
        item.metrics.inputToGridGap +
        item.metrics.bubbleRadius
      const columnXs = Array.from({ length: item.metrics.safeColumns }, (_, index) => gridLeftX + index * item.metrics.columnSpacing)
      const rowSymbols = getMathRowSymbolsFromBlock(item.section)
      const firstColumnX = columnXs[0] ?? gridLeftX
      const firstRowY = gridTopY
      const secondColumnX = columnXs[1] ?? firstColumnX
      const secondRowY = rowSymbols[1] ? gridTopY + item.metrics.rowSpacing : firstRowY
      const lastColumnX = columnXs[columnXs.length - 1] ?? firstColumnX
      const lastRowY = gridTopY + Math.max(0, rowSymbols.length - 1) * item.metrics.rowSpacing

      const baseGeometry: MathGridImageGeometry = {
        startX: firstColumnX,
        startY: firstRowY,
        columnGap: Math.max(0, secondColumnX - firstColumnX),
        rowGap: Math.max(0, secondRowY - firstRowY),
        bubbleRadius: item.metrics.bubbleRadius,
        rowSymbols,
        markThreshold: 0.45,
        ambiguityThreshold: 0.08,
        spatialTolerancePx: 2,
      }

      if (
        firstColumnX >= 0 &&
        firstRowY >= 0 &&
        lastColumnX <= TEMPLATE_PAGE_WIDTH + item.metrics.bubbleRadius &&
        lastRowY <= TEMPLATE_PAGE_HEIGHT + item.metrics.bubbleRadius
      ) {
        derivedGeometry = scaleDerivedGeometry({
          pageWidth: layoutArea.pageWidth,
          pageHeight: layoutArea.pageHeight,
          rasterizedWidth: params.rasterizedPage.width,
          rasterizedHeight: params.rasterizedPage.height,
          geometry: baseGeometry,
        })
      }

      cursorX += item.blockWidth + distributedGap
    })

    const rowHeight = Math.max(...pendingMathRow.map((item) => item.metrics.totalHeight))
    currentY += rowHeight + Math.max(...pendingMathRow.map((item) => item.metrics.afterGap))
    pendingMathRow = []
  }

  for (const section of params.pageBlocks) {
    if (derivedGeometry) break

    if (section.sectionType !== 'math') {
      flushPendingMathRow()
    }

    switch (section.sectionType) {
      case 'label': {
        const metrics = getLabelSectionMetrics(layoutMetrics.rowOffset)
        currentY += metrics.totalHeight + metrics.afterGap
        break
      }
      case 'spacer': {
        currentY += getSpacerSectionHeight(section.size)
        break
      }
      case 'signature': {
        const metrics = getSignatureSectionMetrics(layoutMetrics.rowOffset)
        currentY += metrics.totalHeight + metrics.afterGap
        break
      }
      case 'open': {
        const metrics = getOpenAnswerSectionMetrics(layoutMetrics.rowOffset, section.lines)
        currentY += metrics.totalHeight + metrics.afterGap
        break
      }
      case 'image': {
        const imageHeight = Math.max(90, layoutMetrics.rowOffset * 6.2)
        const metrics = getImageSectionMetrics(layoutMetrics.rowOffset, getSectionDisplayQuestionNumber(section), imageHeight)
        currentY += metrics.totalHeight + metrics.afterGap
        break
      }
      case 'essay': {
        return null
      }
      case 'math': {
        const rowSymbols = getMathRowSymbolsFromBlock(section)
        const metrics = getMathSectionMetrics(
          layoutMetrics.rowOffset,
          section.columns,
          rowSymbols,
          section.showTopInputRow,
          section.showColumnHeaders,
          getSectionDisplayQuestionNumber(section),
          layoutMetrics.bubbleRadius,
          layoutMetrics.bubbleSpacing,
        )
        const blockWidth = Math.min(layoutArea.right - layoutArea.left, metrics.leftPadding + metrics.gridWidth + metrics.rightPadding)
        const pendingWidth =
          pendingMathRow.reduce((total, item) => total + item.blockWidth, 0) +
          Math.max(0, pendingMathRow.length) * MATH_BLOCK_HORIZONTAL_GAP
        const exceedsPerRow = pendingMathRow.length >= MAX_MATH_BLOCKS_PER_ROW
        const exceedsWidth = pendingMathRow.length > 0 && pendingWidth + blockWidth > layoutArea.right - layoutArea.left
        const exceedsHeight = pendingMathRow.length > 0 && currentY + Math.max(metrics.totalHeight, ...pendingMathRow.map((item) => item.metrics.totalHeight)) > pageBottomY

        if (exceedsPerRow || exceedsWidth || exceedsHeight) {
          flushPendingMathRow()
        }

        pendingMathRow.push({ section, metrics, blockWidth })
        break
      }
      default:
        break
    }
  }

  flushPendingMathRow()
  return derivedGeometry
}
