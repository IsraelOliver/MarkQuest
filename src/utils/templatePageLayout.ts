import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { buildNormalizedRenderModel } from './questionBlocks'
import { getTemplateLayoutMetrics } from './templateLayoutGeometry'

export type TemplateQuestionLayout = ReturnType<typeof getTemplateLayoutMetrics>['questions'][number]
export type TemplateBlockTitleLayout = {
  title: string
  startQuestion: number
  endQuestion: number
  columnIndex: number
  rowIndex: number
  x: number
  y: number
  width: number
  textY: number
  ruleY: number
  sectionHeight: number
}

export type TemplatePageLayout = {
  pageIndex: number
  totalPages: number
  offset: number
  pageQuestionCount: number
  rowsPerPage: number
  metrics: ReturnType<typeof getTemplateLayoutMetrics>
  questions: TemplateQuestionLayout[]
  blockTitles: TemplateBlockTitleLayout[]
}

type DraftPageLayout = {
  pageIndex: number
  totalPages: number
  offset: number
  pageQuestionCount: number
  rowsPerPage: number
  metrics: ReturnType<typeof getTemplateLayoutMetrics>
  questions: TemplateQuestionLayout[]
  blockTitles: TemplateBlockTitleLayout[]
}

function getMinimumCoherentBlockRows(totalQuestionRows: number) {
  return Math.max(1, Math.min(2, totalQuestionRows))
}

function getBlockSectionMetrics(rowOffset: number) {
  const labelHeight = Math.max(16, rowOffset * 0.58)
  const labelGap = Math.max(7, rowOffset * 0.32)
  const afterGap = Math.max(8, rowOffset * 0.38)
  return {
    labelHeight,
    labelGap,
    afterGap,
    totalBeforeQuestions: labelHeight + labelGap,
  }
}

function distributeRowsAcrossPages(totalRows: number, maxRowsPerPage: number) {
  const pageCount = Math.max(1, Math.ceil(totalRows / Math.max(1, maxRowsPerPage)))
  const baseRows = Math.floor(totalRows / pageCount)
  const extraRows = totalRows % pageCount

  return Array.from({ length: pageCount }, (_, index) => baseRows + (index < extraRows ? 1 : 0)).filter(
    (rowCount) => rowCount > 0,
  )
}

function createDraftPageLayout(
  state: CardTemplateEditorState,
  rowsPerPage: number,
  layoutArea: { left: number; right: number },
  resolvedRowOffset: number,
  pageIndex: number,
): DraftPageLayout {
  const metrics = getTemplateLayoutMetrics(
    {
      ...state.omrConfig,
      rowsPerColumn: rowsPerPage,
      totalQuestions: Math.max(1, state.definition.columns * rowsPerPage),
    },
    state.definition,
    layoutArea,
    0,
    Math.max(1, state.definition.columns * rowsPerPage),
    { rowOffset: resolvedRowOffset },
  )

  return {
    pageIndex,
    totalPages: 0,
    offset: 0,
    pageQuestionCount: 0,
    rowsPerPage,
    metrics: {
      ...metrics,
      questions: [],
    },
    questions: [],
    blockTitles: [],
  }
}

export function getPaginatedTemplatePages(state: CardTemplateEditorState): TemplatePageLayout[] {
  const { definition } = state
  const renderModel = buildNormalizedRenderModel(definition, state.visualTheme.answerGridStyle)
  const renderedQuestionCount = Math.max(1, renderModel.totalRenderedQuestions)
  const zones = getCardTemplateZones(state)
  const layoutArea = { left: zones.answers.left, right: zones.answers.right }
  const baseMetrics = getTemplateLayoutMetrics(state.omrConfig, definition, layoutArea, 0, renderedQuestionCount)
  const availableAnswerHeight = zones.answers.bottom - baseMetrics.questionStartY
  let resolvedRowOffset = baseMetrics.rowOffset

  if (definition.rowSpacing === 'uniform' && definition.rowsPerColumn > 1) {
    const compactMetrics = getTemplateLayoutMetrics(
      state.omrConfig,
      { ...definition, rowSpacing: 'compact' },
      layoutArea,
      0,
      renderedQuestionCount,
    )
    const maxAdaptiveRowOffset = availableAnswerHeight / (definition.rowsPerColumn - 1)
    resolvedRowOffset = Math.min(
      baseMetrics.rowOffset,
      Math.max(compactMetrics.rowOffset, maxAdaptiveRowOffset),
    )
  }

  const maxRowsThatFit = Math.max(1, Math.floor(availableAnswerHeight / resolvedRowOffset) + 1)
  const rowsPerPage = Math.max(1, Math.min(definition.rowsPerColumn, maxRowsThatFit))
  const columnCount = Math.max(1, definition.columns)
  const shouldRenderVisualBlocks = definition.enableQuestionBlocks && definition.showQuestionBlockTitles
  const segments = shouldRenderVisualBlocks
    ? renderModel.blocks
        .filter((block) => block.questionNumbers.length > 0)
        .map((block) => ({
          startQuestion: block.questionNumbers[0],
          endQuestion: block.questionNumbers[block.questionNumbers.length - 1],
          title: block.title,
          questionNumbers: block.questionNumbers,
        }))
    : [
        {
          startQuestion: renderModel.questions[0]?.questionNumber ?? 1,
          endQuestion: renderModel.lastRenderedQuestion || 1,
          title: '',
          questionNumbers: renderModel.questions.map((question) => question.questionNumber),
        },
      ]
  const pages: DraftPageLayout[] = []
  const pageBottomY = zones.answers.bottom
  const pageUsableHeight = pageBottomY - baseMetrics.questionStartY
  const blockSectionMetrics = getBlockSectionMetrics(resolvedRowOffset)

  let pageIndex = 0
  let currentPage = createDraftPageLayout(state, rowsPerPage, layoutArea, resolvedRowOffset, pageIndex)
  let currentY = currentPage.metrics.questionStartY

  const pushCurrentPage = () => {
    if (currentPage.questions.length === 0 && currentPage.blockTitles.length === 0) return
    currentPage.pageQuestionCount = currentPage.questions.length
    currentPage.offset = currentPage.questions[0]?.questionNumber
      ? currentPage.questions[0].questionNumber - 1
      : currentPage.blockTitles[0]?.startQuestion
        ? currentPage.blockTitles[0].startQuestion - 1
        : 0
    currentPage.metrics = {
      ...currentPage.metrics,
      questions: currentPage.questions,
    }
    pages.push(currentPage)
    pageIndex += 1
    currentPage = createDraftPageLayout(state, rowsPerPage, layoutArea, resolvedRowOffset, pageIndex)
    currentY = currentPage.metrics.questionStartY
  }

  const getPageBlockBounds = () => {
    const firstColumnX = currentPage.metrics.columnRowStartXs[0] ?? currentPage.metrics.questionStartX
    const lastColumnX =
      currentPage.metrics.columnRowStartXs[columnCount - 1] ??
      firstColumnX + currentPage.metrics.columnOffset * Math.max(0, columnCount - 1)
    const fullBlockWidth = lastColumnX + currentPage.metrics.rowWidth - firstColumnX
    return { firstColumnX, fullBlockWidth }
  }

  segments.forEach((segment, segmentIndex) => {
    const totalSegmentQuestions = segment.questionNumbers.length
    if (totalSegmentQuestions <= 0) return

    const showBlockTitle = shouldRenderVisualBlocks && segment.title.length > 0
    const titleHeight = showBlockTitle ? blockSectionMetrics.totalBeforeQuestions : 0
    const totalQuestionRows = Math.max(1, Math.ceil(totalSegmentQuestions / columnCount))
    const maxQuestionRowsPerSlice = Math.max(
      1,
      Math.floor((pageUsableHeight - titleHeight) / resolvedRowOffset),
    )
    const totalHeightNeeded = totalQuestionRows * resolvedRowOffset + titleHeight
    const blockFitsSingleFreshPage = totalHeightNeeded <= pageUsableHeight
    const minimumCoherentRows = getMinimumCoherentBlockRows(totalQuestionRows)
    const currentQuestionRowsCapacity = Math.max(
      0,
      Math.floor((pageBottomY - currentY - titleHeight) / resolvedRowOffset),
    )
    let rowSlices: number[] = []

    if (blockFitsSingleFreshPage) {
      if (currentY + totalHeightNeeded <= pageBottomY) {
        rowSlices = [totalQuestionRows]
      } else {
        const remainingAfterCurrent = totalQuestionRows - currentQuestionRowsCapacity
        const canUseCurrentPage =
          currentQuestionRowsCapacity >= minimumCoherentRows &&
          remainingAfterCurrent >= minimumCoherentRows

        if (canUseCurrentPage) {
          rowSlices = [currentQuestionRowsCapacity, remainingAfterCurrent]
        } else {
          if (currentY > currentPage.metrics.questionStartY) pushCurrentPage()
          rowSlices = [totalQuestionRows]
        }
      }
    } else {
      const canStartOnCurrentPage =
        currentQuestionRowsCapacity >= minimumCoherentRows &&
        currentQuestionRowsCapacity < totalQuestionRows

      if (currentY > currentPage.metrics.questionStartY && !canStartOnCurrentPage) {
        pushCurrentPage()
      }

      const freshCurrentCapacity = Math.max(
        0,
        Math.floor((pageBottomY - currentY - titleHeight) / resolvedRowOffset),
      )

      if (
        currentY > currentPage.metrics.questionStartY &&
        freshCurrentCapacity >= minimumCoherentRows &&
        freshCurrentCapacity < totalQuestionRows
      ) {
        let firstSliceRows = freshCurrentCapacity
        let remainingAfterFirst = totalQuestionRows - firstSliceRows
        if (remainingAfterFirst > 0 && remainingAfterFirst < minimumCoherentRows && firstSliceRows > minimumCoherentRows) {
          const transfer = Math.min(minimumCoherentRows - remainingAfterFirst, firstSliceRows - minimumCoherentRows)
          firstSliceRows -= transfer
          remainingAfterFirst += transfer
        }
        rowSlices = [firstSliceRows, ...distributeRowsAcrossPages(remainingAfterFirst, maxQuestionRowsPerSlice)]
      } else {
        rowSlices = distributeRowsAcrossPages(totalQuestionRows, maxQuestionRowsPerSlice)
      }
    }

    rowSlices.forEach((rowsForBlockSlice, sliceIndex) => {
      const sliceHeight = rowsForBlockSlice * resolvedRowOffset + titleHeight
      if (currentY + sliceHeight > pageBottomY) {
        pushCurrentPage()
      }

      if (showBlockTitle) {
        const { firstColumnX, fullBlockWidth } = getPageBlockBounds()
        const titleY = currentY
        const titleLabel = sliceIndex === 0 ? segment.title : `${segment.title} (continuação)`
        currentPage.blockTitles.push({
          title: titleLabel,
          startQuestion: segment.startQuestion,
          endQuestion: segment.endQuestion,
          columnIndex: 0,
          rowIndex: Math.max(0, Math.round((currentY - currentPage.metrics.questionStartY) / resolvedRowOffset)),
          x: firstColumnX,
          y: titleY,
          width: fullBlockWidth,
          textY: titleY + blockSectionMetrics.labelHeight * 0.62,
          ruleY: titleY + blockSectionMetrics.labelHeight,
          sectionHeight: blockSectionMetrics.labelHeight,
        })
        currentY += blockSectionMetrics.totalBeforeQuestions
      }

      const questionCountThisSlice = Math.min(
        totalSegmentQuestions - rowSlices.slice(0, sliceIndex).reduce((sum, rowCount) => sum + rowCount * columnCount, 0),
        rowsForBlockSlice * columnCount,
      )
      const questionOffsetBeforeSlice = rowSlices
        .slice(0, sliceIndex)
        .reduce((sum, rowCount) => sum + rowCount * columnCount, 0)

      for (let localIndex = 0; localIndex < questionCountThisSlice; localIndex += 1) {
        const columnIndex = Math.floor(localIndex / rowsForBlockSlice)
        const rowIndexWithinBlock = localIndex % rowsForBlockSlice
        const optionY = currentY + rowIndexWithinBlock * resolvedRowOffset
        const globalRowIndex = Math.max(
          0,
          Math.round((optionY - currentPage.metrics.questionStartY) / resolvedRowOffset),
        )
        const rowStartX =
          currentPage.metrics.columnRowStartXs[columnIndex] ??
          (currentPage.metrics.questionStartX +
            columnIndex * currentPage.metrics.columnOffset -
            (currentPage.metrics.questionLabelWidth +
              currentPage.metrics.questionLabelGap +
              currentPage.metrics.bubbleRadius))
        const labelX = rowStartX + currentPage.metrics.questionLabelWidth
        const optionStartX =
          rowStartX +
          currentPage.metrics.questionLabelWidth +
          currentPage.metrics.questionLabelGap +
          currentPage.metrics.bubbleRadius

        currentPage.questions.push({
          questionNumber: segment.questionNumbers[questionOffsetBeforeSlice + localIndex],
          columnIndex,
          rowIndex: globalRowIndex,
          labelX,
          labelY: optionY,
          optionStartX,
          optionSpacing: currentPage.metrics.bubbleSpacing,
          optionGroupWidth: currentPage.metrics.answerBlockWidth,
          rowStartX,
          rowWidth: currentPage.metrics.rowWidth,
          optionY,
        })
      }
      currentY += rowsForBlockSlice * resolvedRowOffset

      const hasMoreSlices = sliceIndex < rowSlices.length - 1
      const hasNextSegment = segmentIndex < segments.length - 1
      if (!hasMoreSlices && hasNextSegment) {
        currentY += blockSectionMetrics.afterGap
      }
    })
  })

  pushCurrentPage()

  return pages.map((page) => ({
    ...page,
    totalPages: pages.length,
  }))
}
