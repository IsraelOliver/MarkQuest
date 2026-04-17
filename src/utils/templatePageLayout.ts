import type { CardLabelSection, CardNumberingFormat, CardSpacerSection, CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { buildNormalizedRenderModel } from './questionBlocks'
import { getTemplateLayoutMetrics } from './templateLayoutGeometry'
import { getLabelTextFontSize } from './templateRenderMetrics'

export type TemplateQuestionLayout = ReturnType<typeof getTemplateLayoutMetrics>['questions'][number] & {
  blockStartQuestion: number
  localQuestionIndex: number
  numberingFormat: CardNumberingFormat | 'numeric'
  choicesPerQuestion: 2 | 3 | 4 | 5
}

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

export type TemplateLabelLayout = {
  id: string
  text: string
  align: CardLabelSection['align']
  size: CardLabelSection['size']
  x: number
  y: number
  width: number
  height: number
  textY: number
  fontSize: number
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
  labels: TemplateLabelLayout[]
}

type LayoutFlowSection =
  | {
      kind: 'objective'
      id: string
      title: string
      startQuestion: number
      endQuestion: number
      questionNumbers: number[]
    }
  | {
      kind: 'label'
      id: string
      text: string
      align: CardLabelSection['align']
      size: CardLabelSection['size']
    }
  | {
      kind: 'spacer'
      id: string
      size: CardSpacerSection['size']
    }

type ObjectiveFlowSection = {
  kind: 'objective'
  id: string
  title: string
  startQuestion: number
  endQuestion: number
  questionNumbers: number[]
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
  labels: TemplateLabelLayout[]
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

function getLabelSectionMetrics(rowOffset: number, size: CardLabelSection['size']) {
  const fontSize = getLabelTextFontSize(size)
  const topGap = Math.max(16, rowOffset * 0.7)
  const height = Math.max(22, rowOffset * 0.9)
  const afterGap = Math.max(10, rowOffset * 0.44)
  return {
    fontSize,
    topGap,
    height,
    textOffsetY: topGap + height * 0.68,
    totalHeight: topGap + height,
    afterGap,
  }
}

function getSpacerSectionHeight(size: CardSpacerSection['size']) {
  switch (size) {
    case 'sm':
      return 8
    case 'lg':
      return 24
    default:
      return 16
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
    labels: [],
  }
}

function buildLayoutFlowSections(state: CardTemplateEditorState, shouldRenderVisualBlocks: boolean): LayoutFlowSection[] {
  const renderModel = buildNormalizedRenderModel(state.definition)

  if (shouldRenderVisualBlocks) {
    return renderModel.sections
      .map((section) => {
        if (section.sectionType === 'label') {
          return {
            kind: 'label' as const,
            id: section.id,
            text: section.text,
            align: section.align,
            size: section.size,
          }
        }

        if (section.sectionType === 'spacer') {
          return {
            kind: 'spacer' as const,
            id: section.id,
            size: section.size,
          }
        }

        return {
          kind: 'objective' as const,
          id: section.id,
          title: section.title,
          startQuestion: section.startQuestion,
          endQuestion: section.endQuestion,
          questionNumbers: section.questionNumbers,
        }
      })
      .filter(
        (section): section is LayoutFlowSection =>
          section.kind === 'label' || section.kind === 'spacer' || section.questionNumbers.length > 0,
      )
  }

  const flowSections: LayoutFlowSection[] = []
  let pendingObjectiveGroup: ObjectiveFlowSection | null = null

  renderModel.sections.forEach((section) => {
    if (section.sectionType === 'label') {
      if (pendingObjectiveGroup) {
        flowSections.push(pendingObjectiveGroup)
      }
      pendingObjectiveGroup = null
      flowSections.push({
        kind: 'label',
        id: section.id,
        text: section.text,
        align: section.align,
        size: section.size,
      })
      return
    }

    if (section.sectionType === 'spacer') {
      if (pendingObjectiveGroup) {
        flowSections.push(pendingObjectiveGroup)
      }
      pendingObjectiveGroup = null
      flowSections.push({
        kind: 'spacer',
        id: section.id,
        size: section.size,
      })
      return
    }

    if (section.sectionType !== 'objective') return

    if (!section.questionNumbers.length) return

    if (!pendingObjectiveGroup) {
      pendingObjectiveGroup = {
        kind: 'objective',
        id: section.id,
        title: '',
        startQuestion: section.startQuestion,
        endQuestion: section.endQuestion,
        questionNumbers: [...section.questionNumbers],
      }
      return
    }

    pendingObjectiveGroup.endQuestion = section.endQuestion
    pendingObjectiveGroup.questionNumbers.push(...section.questionNumbers)
  })

  if (pendingObjectiveGroup) {
    flowSections.push(pendingObjectiveGroup)
  }

  return flowSections
}

export function getPaginatedTemplatePages(state: CardTemplateEditorState): TemplatePageLayout[] {
  const { definition } = state
  const renderModel = buildNormalizedRenderModel(definition)
  const questionMetadataByNumber = new Map(
    renderModel.questions.map((question) => [question.questionNumber, question] as const),
  )
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
  const flowSections = buildLayoutFlowSections(state, shouldRenderVisualBlocks)
  const pages: DraftPageLayout[] = []
  const pageBottomY = zones.answers.bottom
  const pageUsableHeight = pageBottomY - baseMetrics.questionStartY
  const blockSectionMetrics = getBlockSectionMetrics(resolvedRowOffset)

  let pageIndex = 0
  let currentPage = createDraftPageLayout(state, rowsPerPage, layoutArea, resolvedRowOffset, pageIndex)
  let currentY = currentPage.metrics.questionStartY

  const pushCurrentPage = () => {
    if (currentPage.questions.length === 0 && currentPage.blockTitles.length === 0 && currentPage.labels.length === 0) return
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

  flowSections.forEach((section, sectionIndex) => {
    if (section.kind === 'label') {
      const labelMetrics = getLabelSectionMetrics(resolvedRowOffset, section.size)
      const hasContentOnPage = currentPage.questions.length > 0 || currentPage.blockTitles.length > 0 || currentPage.labels.length > 0

      if (hasContentOnPage && currentY + labelMetrics.totalHeight > pageBottomY) {
        pushCurrentPage()
      }

      const { firstColumnX, fullBlockWidth } = getPageBlockBounds()
      currentPage.labels.push({
        id: section.id,
        text: section.text,
        align: section.align,
        size: section.size,
        x: firstColumnX,
        y: currentY + labelMetrics.topGap,
        width: fullBlockWidth,
        height: labelMetrics.height,
        textY: currentY + labelMetrics.textOffsetY,
        fontSize: labelMetrics.fontSize,
      })
      currentY += labelMetrics.totalHeight

      if (sectionIndex < flowSections.length - 1) {
        currentY += labelMetrics.afterGap
      }
      return
    }

    if (section.kind === 'spacer') {
      const spacerHeight = getSpacerSectionHeight(section.size)
      const hasContentOnPage = currentPage.questions.length > 0 || currentPage.blockTitles.length > 0 || currentPage.labels.length > 0

      if (hasContentOnPage && currentY + spacerHeight > pageBottomY) {
        pushCurrentPage()
      }

      currentY += spacerHeight
      return
    }

    const totalSectionQuestions = section.questionNumbers.length
    if (totalSectionQuestions <= 0) return

    const showBlockTitle = shouldRenderVisualBlocks && section.title.length > 0
    const titleHeight = showBlockTitle ? blockSectionMetrics.totalBeforeQuestions : 0
    const totalQuestionRows = Math.max(1, Math.ceil(totalSectionQuestions / columnCount))
    const maxQuestionRowsPerSlice = Math.max(1, Math.floor((pageUsableHeight - titleHeight) / resolvedRowOffset))
    const totalHeightNeeded = totalQuestionRows * resolvedRowOffset + titleHeight
    const blockFitsSingleFreshPage = totalHeightNeeded <= pageUsableHeight
    const minimumCoherentRows = getMinimumCoherentBlockRows(totalQuestionRows)
    const currentQuestionRowsCapacity = Math.max(
      0,
      Math.floor((pageBottomY - currentY - titleHeight) / resolvedRowOffset),
    )
    let rowSlices: number[] = []

    if (!showBlockTitle) {
      let remainingRows = totalQuestionRows
      let availableRowsOnCurrentPage = Math.max(
        0,
        Math.floor((pageBottomY - currentY - titleHeight) / resolvedRowOffset),
      )

      if (availableRowsOnCurrentPage <= 0 && currentY > currentPage.metrics.questionStartY) {
        pushCurrentPage()
        availableRowsOnCurrentPage = Math.max(
          1,
          Math.floor((pageBottomY - currentY - titleHeight) / resolvedRowOffset),
        )
      }

      const firstSliceRows = Math.min(
        remainingRows,
        Math.max(1, availableRowsOnCurrentPage),
      )
      rowSlices = [firstSliceRows]
      remainingRows -= firstSliceRows

      if (remainingRows > 0) {
        rowSlices.push(...distributeRowsAcrossPages(remainingRows, maxQuestionRowsPerSlice))
      }
    } else if (blockFitsSingleFreshPage) {
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

    rowSlices.forEach((rowsForSectionSlice, sliceIndex) => {
      const sliceHeight = rowsForSectionSlice * resolvedRowOffset + titleHeight
      if (currentY + sliceHeight > pageBottomY) {
        pushCurrentPage()
      }

      if (showBlockTitle) {
        const { firstColumnX, fullBlockWidth } = getPageBlockBounds()
        const titleY = currentY
        const titleLabel = sliceIndex === 0 ? section.title : `${section.title} (continuação)`
        currentPage.blockTitles.push({
          title: titleLabel,
          startQuestion: section.startQuestion,
          endQuestion: section.endQuestion,
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
        totalSectionQuestions - rowSlices.slice(0, sliceIndex).reduce((sum, rowCount) => sum + rowCount * columnCount, 0),
        rowsForSectionSlice * columnCount,
      )
      const questionOffsetBeforeSlice = rowSlices
        .slice(0, sliceIndex)
        .reduce((sum, rowCount) => sum + rowCount * columnCount, 0)

      for (let localIndex = 0; localIndex < questionCountThisSlice; localIndex += 1) {
        const columnIndex = Math.floor(localIndex / rowsForSectionSlice)
        const rowIndexWithinBlock = localIndex % rowsForSectionSlice
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

        const questionNumber = section.questionNumbers[questionOffsetBeforeSlice + localIndex]
        const questionMetadata = questionMetadataByNumber.get(questionNumber)
        currentPage.questions.push({
          questionNumber,
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
          blockStartQuestion: questionMetadata?.blockStartQuestion ?? questionNumber,
          localQuestionIndex: questionMetadata?.localQuestionIndex ?? 0,
          numberingFormat: questionMetadata?.numberingFormat ?? 'numeric',
          choicesPerQuestion: questionMetadata?.alternativesCount ?? definition.choicesPerQuestion,
        })
      }
      currentY += rowsForSectionSlice * resolvedRowOffset

      const hasMoreSlices = sliceIndex < rowSlices.length - 1
      const nextSection = sectionIndex < flowSections.length - 1 ? flowSections[sectionIndex + 1] : null
      const shouldAddSectionGap =
        Boolean(nextSection) &&
        (showBlockTitle || nextSection?.kind === 'label')

      if (!hasMoreSlices && shouldAddSectionGap) {
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
