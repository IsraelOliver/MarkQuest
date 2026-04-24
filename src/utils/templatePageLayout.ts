import type { CardEssaySection, CardLabelSection, CardNumberingFormat, CardOpenSection, CardSignatureSection, CardSpacerSection, CardTemplateEditorState } from '../types/omr'
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

export type TemplateSignatureLayout = {
  id: string
  label: string
  align: CardSignatureSection['align']
  lineWidth: CardSignatureSection['lineWidth']
  x: number
  y: number
  width: number
  height: number
  lineY: number
  labelY: number
  labelX: number
  labelAnchor: 'start' | 'middle' | 'end'
  fontSize: number
}

export type TemplateOpenAnswerLayout = {
  id: string
  label: string
  linkedQuestionNumber: number | null
  lines: number
  lineStyle: CardOpenSection['lineStyle']
  x: number
  y: number
  width: number
  height: number
  labelY: number
  fontSize: number
  answerTopY: number
  answerHeight: number
  lineYs: number[]
}

export type TemplateMathLayout = {
  id: string
  columns: number
  showTopInputRow: boolean
  showColumnHeaders: boolean
  columnHeaders: string[]
  showColumnSeparators: boolean
  columnSeparators: string[]
  x: number
  y: number
  width: number
  height: number
  linkedQuestionNumber: number | null
  titleY: number
  headerY: number
  topInputY: number
  separatorY: number
  gridTopY: number
  columnXs: number[]
  rows: Array<{
    digit: number
    y: number
  }>
  bubbleRadius: number
  inputBoxWidth: number
  inputBoxHeight: number
}

export type TemplateEssayLayout = {
  id: string
  title: string
  style: CardEssaySection['style']
  showHeader: boolean
  showEssayTitleField: boolean
  lines: number
  highlightStep: number
  showLogo: boolean
  logoPosition: CardEssaySection['logoPosition']
  showQRCode: boolean
  qrPosition: CardEssaySection['qrPosition']
  x: number
  y: number
  width: number
  height: number
  titleY: number
  logoBox: {
    x: number
    y: number
    width: number
    height: number
  } | null
  qrBox: {
    x: number
    y: number
    size: number
  } | null
  headerFields: Array<{
    key: 'studentName' | 'class' | 'testName' | 'code' | 'teacher' | 'shift' | 'date'
    label: string
    x: number
    y: number
    labelWidth: number
    lineX: number
    lineWidth: number
  }>
  essayTitleLabelY: number
  essayTitleLineY: number
  writingTopY: number
  answerBox: {
    x: number
    y: number
    width: number
    height: number
  }
  numberColumnWidth: number
  lineLayouts: Array<{
    number: number
    numberX: number
    numberY: number
    lineY: number
    lineX: number
    lineWidth: number
    highlight: boolean
  }>
}

export type TemplatePageLayout = {
  pageKind: 'standard' | 'essay'
  pageIndex: number
  totalPages: number
  offset: number
  pageQuestionCount: number
  rowsPerPage: number
  metrics: ReturnType<typeof getTemplateLayoutMetrics>
  questions: TemplateQuestionLayout[]
  blockTitles: TemplateBlockTitleLayout[]
  labels: TemplateLabelLayout[]
  openAnswers: TemplateOpenAnswerLayout[]
  mathBlocks: TemplateMathLayout[]
  essays: TemplateEssayLayout[]
  signatures: TemplateSignatureLayout[]
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
      kind: 'essay'
      id: string
      title: string
      style: CardEssaySection['style']
      lines: number
      highlightStep: number
      showHeader: boolean
      showEssayTitleField: boolean
      showStudentName: boolean
      showClass: boolean
      showTestName: boolean
      showCode: boolean
      showTeacher: boolean
      showShift: boolean
      showDate: boolean
      showLogo: boolean
      logoPosition: CardEssaySection['logoPosition']
      showQRCode: boolean
      qrPosition: CardEssaySection['qrPosition']
    }
  | {
      kind: 'open'
      id: string
      label: string
      lines: number
      lineStyle: CardOpenSection['lineStyle']
      linkedQuestionNumber: number | null
    }
  | {
      kind: 'math'
      id: string
      columns: number
      showTopInputRow: boolean
      showColumnHeaders: boolean
      columnHeaders: string[]
      showColumnSeparators: boolean
      columnSeparators: string[]
      linkedQuestionNumber: number | null
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
  | {
      kind: 'pageBreak'
      id: string
    }
  | {
      kind: 'signature'
      id: string
      label: string
      align: CardSignatureSection['align']
      lineWidth: CardSignatureSection['lineWidth']
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
  pageKind: 'standard' | 'essay'
  pageIndex: number
  totalPages: number
  offset: number
  pageQuestionCount: number
  rowsPerPage: number
  metrics: ReturnType<typeof getTemplateLayoutMetrics>
  questions: TemplateQuestionLayout[]
  blockTitles: TemplateBlockTitleLayout[]
  labels: TemplateLabelLayout[]
  openAnswers: TemplateOpenAnswerLayout[]
  mathBlocks: TemplateMathLayout[]
  essays: TemplateEssayLayout[]
  signatures: TemplateSignatureLayout[]
}

type PendingMathRowItem = {
  section: Extract<LayoutFlowSection, { kind: 'math' }>
  metrics: ReturnType<typeof getMathSectionMetrics>
  blockWidth: number
}

const MAX_MATH_BLOCKS_PER_ROW = 6
const MATH_BLOCK_HORIZONTAL_GAP = 16

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

function getOpenAnswerSectionMetrics(rowOffset: number, lines: number) {
  const safeLines = Math.min(20, Math.max(1, Math.round(lines)))
  const topGap = Math.max(16, rowOffset * 0.58)
  const labelHeight = 14
  const labelToAnswerGap = Math.max(10, rowOffset * 0.34)
  const lineSpacing = Math.max(16, Math.min(22, rowOffset * 0.72))
  const answerHeight = safeLines * lineSpacing
  const afterGap = Math.max(12, rowOffset * 0.42)

  return {
    fontSize: 10,
    safeLines,
    topGap,
    labelHeight,
    labelToAnswerGap,
    lineSpacing,
    answerHeight,
    afterGap,
    totalHeight: topGap + labelHeight + labelToAnswerGap + answerHeight,
  }
}

function getOpenAnswerTitleMetrics(linkedQuestionNumber: number | null) {
  if (!linkedQuestionNumber) return { titleHeight: 0, titleGap: 0 }
  return { titleHeight: 12, titleGap: 8 }
}

function getMathColumns(value: number) {
  return Math.min(10, Math.max(1, Math.round(value)))
}

function getMathSectionMetrics(
  rowOffset: number,
  columns: number,
  showTopInputRow: boolean,
  showColumnHeaders: boolean,
  showColumnSeparators: boolean,
  linkedQuestionNumber: number | null,
  sharedBubbleRadius: number,
  sharedBubbleSpacing: number,
) {
  const safeColumns = getMathColumns(columns)
  const topGap = Math.max(18, rowOffset * 0.66)
  const titleHeight = linkedQuestionNumber ? 12 : 0
  const titleToContentGap = linkedQuestionNumber ? 7 : 0
  const compactVerticalGap = Math.max(6, Math.min(8, rowOffset * 0.24))
  const headerHeight = showColumnHeaders ? 12 : 0
  const headerToInputGap = showColumnHeaders && showTopInputRow ? Math.max(4, compactVerticalGap - 1) : 0
  const headerToGridGap = showColumnHeaders && !showTopInputRow && !showColumnSeparators ? compactVerticalGap : 0
  const inputHeight = showTopInputRow ? 16 : 0
  const inputToSeparatorGap = showTopInputRow && showColumnSeparators ? compactVerticalGap : 0
  const inputToGridGap = showTopInputRow && !showColumnSeparators ? Math.max(4, compactVerticalGap - 3) : 0
  const separatorHeight = showColumnSeparators ? 10 : 0
  const separatorToGridGap = showColumnSeparators ? compactVerticalGap : 0
  const rowSpacing = rowOffset
  const gridHeight = 10 * rowSpacing
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
    inputToSeparatorGap,
    inputToGridGap,
    separatorHeight,
    separatorToGridGap,
    compactVerticalGap,
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
      inputToSeparatorGap +
      inputToGridGap +
      separatorHeight +
      separatorToGridGap +
      gridHeight,
  }
}

function getEssayLines(value: number) {
  return Math.min(60, Math.max(10, Math.round(value)))
}

function getEssayHighlightStep(value: number) {
  return Math.min(20, Math.max(0, Math.round(value)))
}

function getEssayLogoBox(
  position: CardEssaySection['logoPosition'],
  bounds: { x: number; y: number; width: number },
) {
  const width = 92
  const height = 38
  const x =
    position === 'top-center'
      ? bounds.x + (bounds.width - width) / 2
      : position === 'top-right'
        ? bounds.x + bounds.width - width
        : bounds.x

  return { x, y: bounds.y, width, height }
}

function getEssayQrBox(
  position: CardEssaySection['qrPosition'],
  bounds: { x: number; y: number; width: number; bottomY: number },
) {
  const size = 62
  const x = bounds.x + bounds.width - size
  const y = position === 'top-right' ? bounds.y : bounds.bottomY - size
  return { x, y, size }
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

function getSignatureSectionMetrics(rowOffset: number) {
  const topGap = Math.max(22, rowOffset * 0.78)
  const lineToLabelGap = Math.max(12, rowOffset * 0.36)
  const labelHeight = 12
  const afterGap = Math.max(12, rowOffset * 0.42)
  return {
    fontSize: 8.5,
    topGap,
    lineToLabelGap,
    labelHeight,
    afterGap,
    totalHeight: topGap + lineToLabelGap + labelHeight,
  }
}

function getSignatureWidthRatio(lineWidth: CardSignatureSection['lineWidth']) {
  if (lineWidth === 'sm') return 0.38
  if (lineWidth === 'lg') return 0.78
  return 0.56
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
    pageKind: 'standard',
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
    openAnswers: [],
    mathBlocks: [],
    essays: [],
    signatures: [],
  }
}

function createEssayLayout(
  section: Extract<LayoutFlowSection, { kind: 'essay' }>,
  zones: ReturnType<typeof getCardTemplateZones>,
): TemplateEssayLayout {
  const pagePaddingX = 34
  const x = zones.page.x + pagePaddingX
  const y = zones.page.y + 34
  const width = zones.page.width - pagePaddingX * 2
  const bottomY = zones.page.y + zones.page.height - 34
  const lines = getEssayLines(section.lines)
  const highlightStep = getEssayHighlightStep(section.highlightStep)
  const titleY = y + 18
  const logoBox = section.showLogo ? getEssayLogoBox(section.logoPosition, { x, y, width }) : null
  const qrBox = section.showQRCode ? getEssayQrBox(section.qrPosition, { x, y, width, bottomY }) : null
  const headerTopY = Math.max(titleY + 30, logoBox ? logoBox.y + logoBox.height + 20 : titleY + 34)
  const headerRows: Array<Array<{ key: TemplateEssayLayout['headerFields'][number]['key']; label: string; widthRatio: number }>> = []

  if (section.showStudentName || section.showTestName) {
    headerRows.push([
      ...(section.showStudentName ? [{ key: 'studentName' as const, label: 'Aluno:', widthRatio: 0.54 }] : []),
      ...(section.showTestName ? [{ key: 'testName' as const, label: 'Teste:', widthRatio: 0.46 }] : []),
    ])
  }

  if (section.showClass || section.showCode) {
    headerRows.push([
      ...(section.showClass ? [{ key: 'class' as const, label: 'Classe:', widthRatio: 0.54 }] : []),
      ...(section.showCode ? [{ key: 'code' as const, label: 'Código:', widthRatio: 0.46 }] : []),
    ])
  }

  const optionalFields = [
    ...(section.showTeacher ? [{ key: 'teacher' as const, label: 'Professor:' }] : []),
    ...(section.showShift ? [{ key: 'shift' as const, label: 'Turno:' }] : []),
    ...(section.showDate ? [{ key: 'date' as const, label: 'Data:' }] : []),
  ]
  if (optionalFields.length) {
    headerRows.push(optionalFields.map((field) => ({ ...field, widthRatio: 1 / optionalFields.length })))
  }

  const headerFields = section.showHeader
    ? headerRows.flatMap((row, rowIndex) => {
        const ratioTotal = row.reduce((sum, field) => sum + field.widthRatio, 0) || 1
        let cursorX = x
        return row.map((field) => {
          const fieldWidth = width * (field.widthRatio / ratioTotal)
          const labelWidth = field.label.length * 5.2
          const layout = {
            key: field.key,
            label: field.label,
            x: cursorX,
            y: headerTopY + rowIndex * 24,
            labelWidth,
            lineX: cursorX + labelWidth + 5,
            lineWidth: Math.max(28, fieldWidth - labelWidth - 14),
          }
          cursorX += fieldWidth
          return layout
        })
      })
    : []
  const afterHeaderY = section.showHeader && headerRows.length ? headerTopY + headerRows.length * 24 + 4 : titleY + 22
  const essayTitleLabelY = afterHeaderY + 18
  const essayTitleLineY = essayTitleLabelY + 13
  const writingTopY = section.showEssayTitleField ? essayTitleLineY + 24 : afterHeaderY + 18
  const availableWritingHeight = Math.max(180, bottomY - writingTopY)
  const lineSpacing = Math.min(20, Math.max(11, availableWritingHeight / lines))
  const numberColumnWidth = 26
  const lineX = x + numberColumnWidth + 8
  const lineWidth = width - numberColumnWidth - 8
  const answerBox = {
    x: lineX,
    y: writingTopY - 8,
    width: lineWidth,
    height: Math.max(24, (lines - 1) * lineSpacing + 16),
  }
  const lineLayouts = Array.from({ length: lines }, (_, index) => {
    const number = index + 1
    const lineY = writingTopY + index * lineSpacing
    return {
      number,
      numberX: x + numberColumnWidth - 6,
      numberY: lineY - 3,
      lineY,
      lineX,
      lineWidth,
      highlight: highlightStep > 0 && number % highlightStep === 0,
    }
  })

  return {
    id: section.id,
    title: section.title,
    style: section.style,
    showHeader: section.showHeader,
    showEssayTitleField: section.showEssayTitleField,
    lines,
    highlightStep,
    showLogo: section.showLogo,
    logoPosition: section.logoPosition,
    showQRCode: section.showQRCode,
    qrPosition: section.qrPosition,
    x,
    y,
    width,
    height: bottomY - y,
    titleY,
    logoBox,
    qrBox,
    headerFields,
    essayTitleLabelY,
    essayTitleLineY,
    writingTopY,
    answerBox,
    numberColumnWidth,
    lineLayouts,
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

        if (section.sectionType === 'pageBreak') {
          return {
            kind: 'pageBreak' as const,
            id: section.id,
          }
        }

        if (section.sectionType === 'open') {
          return {
            kind: 'open' as const,
            id: section.id,
            label: section.label,
            lines: section.lines,
            lineStyle: section.lineStyle,
            linkedQuestionNumber: section.linkedToMainQuestion ? section.linkedQuestionNumber : null,
          }
        }

        if (section.sectionType === 'math') {
          return {
            kind: 'math' as const,
            id: section.id,
            columns: section.columns,
            showTopInputRow: section.showTopInputRow,
            showColumnHeaders: section.showColumnHeaders,
            columnHeaders: section.columnHeaders,
            showColumnSeparators: section.showColumnSeparators,
            columnSeparators: section.columnSeparators,
            linkedQuestionNumber: section.linkedToMainQuestion ? section.linkedQuestionNumber : null,
          }
        }

        if (section.sectionType === 'essay') {
          return {
            kind: 'essay' as const,
            id: section.id,
            title: section.title,
            style: section.style,
            lines: section.lines,
            highlightStep: section.highlightStep,
            showHeader: section.showHeader,
            showEssayTitleField: section.showEssayTitleField,
            showStudentName: section.showStudentName,
            showClass: section.showClass,
            showTestName: section.showTestName,
            showCode: section.showCode,
            showTeacher: section.showTeacher,
            showShift: section.showShift,
            showDate: section.showDate,
            showLogo: section.showLogo,
            logoPosition: section.logoPosition,
            showQRCode: section.showQRCode,
            qrPosition: section.qrPosition,
          }
        }

        if (section.sectionType === 'signature') {
          return {
            kind: 'signature' as const,
            id: section.id,
            label: section.label,
            align: section.align,
            lineWidth: section.lineWidth,
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
          section.kind === 'label' ||
          section.kind === 'spacer' ||
          section.kind === 'pageBreak' ||
          section.kind === 'open' ||
          section.kind === 'math' ||
          section.kind === 'essay' ||
          section.kind === 'signature' ||
          section.questionNumbers.length > 0,
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

    if (section.sectionType === 'open') {
      if (pendingObjectiveGroup) {
        flowSections.push(pendingObjectiveGroup)
      }
      pendingObjectiveGroup = null
      flowSections.push({
        kind: 'open',
        id: section.id,
        label: section.label,
        lines: section.lines,
        lineStyle: section.lineStyle,
        linkedQuestionNumber: section.linkedToMainQuestion ? section.linkedQuestionNumber : null,
      })
      return
    }

    if (section.sectionType === 'math') {
      if (pendingObjectiveGroup) {
        flowSections.push(pendingObjectiveGroup)
      }
      pendingObjectiveGroup = null
      flowSections.push({
        kind: 'math',
        id: section.id,
        columns: section.columns,
        showTopInputRow: section.showTopInputRow,
        showColumnHeaders: section.showColumnHeaders,
        columnHeaders: section.columnHeaders,
        showColumnSeparators: section.showColumnSeparators,
        columnSeparators: section.columnSeparators,
        linkedQuestionNumber: section.linkedToMainQuestion ? section.linkedQuestionNumber : null,
      })
      return
    }

    if (section.sectionType === 'essay') {
      if (pendingObjectiveGroup) {
        flowSections.push(pendingObjectiveGroup)
      }
      pendingObjectiveGroup = null
      flowSections.push({
        kind: 'essay',
        id: section.id,
        title: section.title,
        style: section.style,
        lines: section.lines,
        highlightStep: section.highlightStep,
        showHeader: section.showHeader,
        showEssayTitleField: section.showEssayTitleField,
        showStudentName: section.showStudentName,
        showClass: section.showClass,
        showTestName: section.showTestName,
        showCode: section.showCode,
        showTeacher: section.showTeacher,
        showShift: section.showShift,
        showDate: section.showDate,
        showLogo: section.showLogo,
        logoPosition: section.logoPosition,
        showQRCode: section.showQRCode,
        qrPosition: section.qrPosition,
      })
      return
    }

    if (section.sectionType === 'pageBreak') {
      if (pendingObjectiveGroup) {
        flowSections.push(pendingObjectiveGroup)
      }
      pendingObjectiveGroup = null
      flowSections.push({
        kind: 'pageBreak',
        id: section.id,
      })
      return
    }

    if (section.sectionType === 'signature') {
      if (pendingObjectiveGroup) {
        flowSections.push(pendingObjectiveGroup)
      }
      pendingObjectiveGroup = null
      flowSections.push({
        kind: 'signature',
        id: section.id,
        label: section.label,
        align: section.align,
        lineWidth: section.lineWidth,
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
  let pendingMathRow: PendingMathRowItem[] = []

  const pushCurrentPage = () => {
    if (
      currentPage.questions.length === 0 &&
      currentPage.blockTitles.length === 0 &&
      currentPage.labels.length === 0 &&
      currentPage.openAnswers.length === 0 &&
      currentPage.mathBlocks.length === 0 &&
      currentPage.essays.length === 0 &&
      currentPage.signatures.length === 0
    ) return
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

  const hasContentOnPage = () =>
    currentPage.questions.length > 0 ||
    currentPage.blockTitles.length > 0 ||
    currentPage.labels.length > 0 ||
    currentPage.openAnswers.length > 0 ||
    currentPage.mathBlocks.length > 0 ||
    currentPage.essays.length > 0 ||
    currentPage.signatures.length > 0

  const flushPendingMathRow = (addGapAfterRow: boolean) => {
    if (!pendingMathRow.length) return

    const rowHeight = Math.max(...pendingMathRow.map((item) => item.metrics.totalHeight))
    const totalBlockWidth = pendingMathRow.reduce((total, item) => total + item.blockWidth, 0)
    const availableRowWidth = layoutArea.right - layoutArea.left
    const distributedGap =
      state.definition.columnLayoutMode === 'distributed' && pendingMathRow.length > 1
        ? Math.max(
            MATH_BLOCK_HORIZONTAL_GAP,
            (availableRowWidth - totalBlockWidth) / Math.max(1, pendingMathRow.length - 1),
          )
        : MATH_BLOCK_HORIZONTAL_GAP
    let cursorX = layoutArea.left

    pendingMathRow.forEach(({ section, metrics, blockWidth }) => {
      const blockX = cursorX
      const gridLeftX = blockX + metrics.leftPadding + metrics.bubbleRadius
      const columnSpacing = metrics.safeColumns === 1 ? 0 : metrics.columnSpacing
      const sectionY = currentY + metrics.topGap
      const titleY = sectionY + metrics.titleHeight * 0.82
      const contentTopY = sectionY + metrics.titleHeight + metrics.titleToContentGap
      const headerY = contentTopY + metrics.headerHeight * 0.82
      const topInputY = Math.round(
        contentTopY + metrics.headerHeight + metrics.headerToInputGap + metrics.inputBoxHeight * 0.5,
      )
      const separatorY =
        contentTopY +
        metrics.headerHeight +
        metrics.headerToInputGap +
        metrics.headerToGridGap +
        metrics.inputHeight +
        metrics.inputToSeparatorGap +
        metrics.separatorHeight * 0.74
      const gridTopY =
        contentTopY +
        metrics.headerHeight +
        metrics.headerToInputGap +
        metrics.headerToGridGap +
        metrics.inputHeight +
        metrics.inputToSeparatorGap +
        metrics.inputToGridGap +
        metrics.separatorHeight +
        metrics.separatorToGridGap +
        metrics.bubbleRadius

      currentPage.mathBlocks.push({
        id: section.id,
        columns: metrics.safeColumns,
        showTopInputRow: section.showTopInputRow,
        showColumnHeaders: section.showColumnHeaders,
        columnHeaders: Array.from({ length: metrics.safeColumns }, (_, index) => section.columnHeaders[index] ?? ''),
        showColumnSeparators: section.showColumnSeparators,
        columnSeparators: Array.from({ length: metrics.safeColumns }, (_, index) => section.columnSeparators[index] ?? ''),
        x: blockX,
        y: sectionY,
        width: blockWidth,
        height: metrics.totalHeight,
        linkedQuestionNumber: section.linkedQuestionNumber,
        titleY,
        headerY,
        topInputY,
        separatorY,
        gridTopY,
        columnXs: Array.from({ length: metrics.safeColumns }, (_, index) => gridLeftX + index * columnSpacing),
        rows: Array.from({ length: 10 }, (_, digit) => ({
          digit,
          y: gridTopY + digit * metrics.rowSpacing,
        })),
        bubbleRadius: metrics.bubbleRadius,
        inputBoxWidth: metrics.inputBoxWidth,
        inputBoxHeight: metrics.inputBoxHeight,
      })

      cursorX += blockWidth + distributedGap
    })

    currentY += rowHeight
    if (addGapAfterRow) {
      currentY += Math.max(...pendingMathRow.map((item) => item.metrics.afterGap))
    }
    pendingMathRow = []
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
    if (section.kind !== 'math') {
      flushPendingMathRow(sectionIndex < flowSections.length - 1)
    }

    if (section.kind === 'pageBreak') {
      pushCurrentPage()
      return
    }

    if (section.kind === 'essay') {
      pushCurrentPage()
      currentPage.pageKind = 'essay'
      currentPage.essays.push(createEssayLayout(section, zones))
      pushCurrentPage()
      return
    }

    if (section.kind === 'signature') {
      const signatureMetrics = getSignatureSectionMetrics(resolvedRowOffset)
      if (hasContentOnPage() && currentY + signatureMetrics.totalHeight > pageBottomY) {
        pushCurrentPage()
      }

      const signatureAreaX = layoutArea.left
      const signatureAreaWidth = layoutArea.right - layoutArea.left
      const signatureWidth = signatureAreaWidth * getSignatureWidthRatio(section.lineWidth)
      const signatureX =
        section.align === 'center'
          ? signatureAreaX + (signatureAreaWidth - signatureWidth) / 2
          : section.align === 'right'
            ? signatureAreaX + signatureAreaWidth - signatureWidth
            : signatureAreaX
      const labelAnchor = section.align === 'center' ? 'middle' : section.align === 'right' ? 'end' : 'start'
      const labelX =
        section.align === 'center'
          ? signatureX + signatureWidth / 2
          : section.align === 'right'
            ? signatureX + signatureWidth
            : signatureX
      const sectionY = currentY + signatureMetrics.topGap
      const lineY = sectionY
      currentPage.signatures.push({
        id: section.id,
        label: section.label,
        align: section.align,
        lineWidth: section.lineWidth,
        x: signatureX,
        y: sectionY,
        width: signatureWidth,
        height: signatureMetrics.totalHeight,
        lineY,
        labelY: lineY + signatureMetrics.lineToLabelGap,
        labelX,
        labelAnchor,
        fontSize: signatureMetrics.fontSize,
      })
      currentY += signatureMetrics.totalHeight

      if (sectionIndex < flowSections.length - 1) {
        currentY += signatureMetrics.afterGap
      }
      return
    }

    if (section.kind === 'open') {
  const openMetrics = getOpenAnswerSectionMetrics(resolvedRowOffset, section.lines)
      const openTitleMetrics = getOpenAnswerTitleMetrics(section.linkedQuestionNumber)
      if (hasContentOnPage() && currentY + openTitleMetrics.titleHeight + openTitleMetrics.titleGap + openMetrics.totalHeight > pageBottomY) {
        pushCurrentPage()
      }

      const answerAreaX = layoutArea.left
      const answerAreaWidth = layoutArea.right - layoutArea.left
      const sectionY = currentY + openTitleMetrics.titleHeight + openTitleMetrics.titleGap + openMetrics.topGap
      const answerTopY = sectionY + openMetrics.labelHeight + openMetrics.labelToAnswerGap
      currentPage.openAnswers.push({
        id: section.id,
        label: section.label,
        linkedQuestionNumber: section.linkedQuestionNumber,
        lines: openMetrics.safeLines,
        lineStyle: section.lineStyle,
        x: answerAreaX,
        y: sectionY,
        width: answerAreaWidth,
        height: openMetrics.totalHeight,
        labelY: sectionY + openMetrics.labelHeight * 0.72,
        fontSize: openMetrics.fontSize,
        answerTopY,
        answerHeight: openMetrics.answerHeight,
        lineYs: Array.from({ length: openMetrics.safeLines }, (_, index) => answerTopY + (index + 1) * openMetrics.lineSpacing),
      })
      currentY += openTitleMetrics.titleHeight + openTitleMetrics.titleGap + openMetrics.totalHeight

      if (sectionIndex < flowSections.length - 1) {
        currentY += openMetrics.afterGap
      }
      return
    }

    if (section.kind === 'math') {
      const mathMetrics = getMathSectionMetrics(
        resolvedRowOffset,
        section.columns,
        section.showTopInputRow,
        section.showColumnHeaders,
        section.showColumnSeparators,
        section.linkedQuestionNumber,
        currentPage.metrics.bubbleRadius,
        currentPage.metrics.bubbleSpacing,
      )
      const blockWidth = Math.min(
        layoutArea.right - layoutArea.left,
        mathMetrics.leftPadding + mathMetrics.gridWidth + mathMetrics.rightPadding,
      )

      const pendingRowWidth =
        pendingMathRow.reduce((total, item) => total + item.blockWidth, 0) +
        Math.max(0, pendingMathRow.length) * MATH_BLOCK_HORIZONTAL_GAP
      const nextRowWidth = pendingRowWidth + blockWidth
      const nextRowHeight = Math.max(
        mathMetrics.totalHeight,
        ...pendingMathRow.map((item) => item.metrics.totalHeight),
      )
      const exceedsPerRowLimit = pendingMathRow.length >= MAX_MATH_BLOCKS_PER_ROW
      const exceedsAvailableWidth = pendingMathRow.length > 0 && nextRowWidth > layoutArea.right - layoutArea.left
      const exceedsPageHeight = pendingMathRow.length > 0 && currentY + nextRowHeight > pageBottomY

      if (exceedsPerRowLimit || exceedsAvailableWidth || exceedsPageHeight) {
        flushPendingMathRow(true)
      }

      if (!pendingMathRow.length && hasContentOnPage() && currentY + mathMetrics.totalHeight > pageBottomY) {
        pushCurrentPage()
      }

      pendingMathRow.push({
        section,
        metrics: mathMetrics,
        blockWidth,
      })

      const nextSection = sectionIndex < flowSections.length - 1 ? flowSections[sectionIndex + 1] : null
      if (nextSection?.kind !== 'math') {
        flushPendingMathRow(sectionIndex < flowSections.length - 1)
      }
      return
    }

    if (section.kind === 'label') {
      const labelMetrics = getLabelSectionMetrics(resolvedRowOffset, section.size)
      if (hasContentOnPage() && currentY + labelMetrics.totalHeight > pageBottomY) {
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
      if (hasContentOnPage() && currentY + spacerHeight > pageBottomY) {
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
