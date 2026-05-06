import type { CardEssaySection, CardImageSection, CardLabelSection, CardNumberingFormat, CardOpenSection, CardSignatureSection, CardSpacerSection, CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { buildNormalizedRenderModel, getMathAllowedCharacters } from './questionBlocks'
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
  displayQuestionNumber: number | null
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
  separatorMode: 'none' | 'comma' | 'dot' | 'negative' | 'negative-comma' | 'negative-dot'
  columnSeparators: string[]
  x: number
  y: number
  width: number
  height: number
  displayQuestionNumber: number | null
  linkedQuestionNumber: number | null
  titleY: number
  headerY: number
  topInputY: number
  separatorY: number
  gridTopY: number
  columnXs: number[]
  rows: Array<{
    symbol: string
    y: number
  }>
  bubbleRadius: number
  inputBoxWidth: number
  inputBoxHeight: number
}

export type TemplateImageLayout = {
  id: string
  imageSrc: string | null
  imageName: string | null
  imageWidth: number | null
  imageHeight: number | null
  size: CardImageSection['size']
  align: CardImageSection['align']
  displayQuestionNumber: number | null
  linkedQuestionNumber: number | null
  x: number
  y: number
  width: number
  height: number
  imageBoxY: number
  imageBoxHeight: number
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
  essayTitleLineX: number
  essayTitleLineWidth: number
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
    rowTopY: number
    rowBottomY: number
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
  images: TemplateImageLayout[]
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
      displayQuestionNumber: number | null
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
        separatorMode: 'none' | 'comma' | 'dot' | 'negative' | 'negative-comma' | 'negative-dot'
        columnSeparators: string[]
        displayQuestionNumber: number | null
        linkedQuestionNumber: number | null
      }
  | {
      kind: 'image'
      id: string
      imageSrc: string | null
      imageName: string | null
      imageWidth: number | null
      imageHeight: number | null
      size: CardImageSection['size']
      align: CardImageSection['align']
      displayQuestionNumber: number | null
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
  images: TemplateImageLayout[]
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

function getOpenAnswerTitleMetrics(displayQuestionNumber: number | null) {
  if (!displayQuestionNumber) return { titleHeight: 0, titleGap: 0 }
  return { titleHeight: 12, titleGap: 8 }
}

function getImageSizeRatio(size: CardImageSection['size']) {
  if (size === 'auto') return 1
  if (size === '25') return 0.25
  if (size === '75') return 0.75
  if (size === '100') return 1
  return 0.5
}

function getImageSectionMetrics(
  rowOffset: number,
  displayQuestionNumber: number | null,
  imageHeight: number,
) {
  const topGap = Math.max(14, rowOffset * 0.56)
  const titleHeight = displayQuestionNumber ? 14 : 0
  const titleGap = displayQuestionNumber ? 7 : 0
  const imageBoxHeight = Math.max(36, imageHeight)
  const afterGap = Math.max(12, rowOffset * 0.42)

  return {
    fontSize: 10,
    topGap,
    titleHeight,
    titleGap,
    imageBoxHeight,
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
  columnSeparators: string[],
  showTopInputRow: boolean,
  showColumnHeaders: boolean,
  displayQuestionNumber: number | null,
  sharedBubbleRadius: number,
  sharedBubbleSpacing: number,
) {
  const symbolCount = getMathAllowedCharacters(columnSeparators).length
  const safeColumns = getMathColumns(columns)
  const topGap = Math.max(18, rowOffset * 0.66)
  const titleHeight = displayQuestionNumber ? 12 : 0
  const titleToContentGap = displayQuestionNumber ? 7 : 0
  const compactVerticalGap = Math.max(6, Math.min(8, rowOffset * 0.24))
  const headerHeight = showColumnHeaders ? 12 : 0
  const headerToInputGap = showColumnHeaders && showTopInputRow ? Math.max(4, compactVerticalGap - 1) : 0
  const headerToGridGap = showColumnHeaders && !showTopInputRow ? compactVerticalGap : 0
  const inputHeight = showTopInputRow ? 16 : 0
  const inputToSeparatorGap = 0
  const inputToGridGap = showTopInputRow ? Math.max(4, compactVerticalGap - 3) : 0
  const separatorHeight = 0
  const separatorToGridGap = 0
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
    images: [],
    essays: [],
    signatures: [],
  }
}

function createEssayLayout(
  section: Extract<LayoutFlowSection, { kind: 'essay' }>,
  zones: ReturnType<typeof getCardTemplateZones>,
  state: CardTemplateEditorState,
): TemplateEssayLayout {
  const { definition } = state
  const pagePaddingX = 34
  const x = zones.page.x + pagePaddingX
  const y = zones.page.y + 24
  const width = zones.page.width - pagePaddingX * 2
  const bottomY = zones.footer.top - 18
  const lines = getEssayLines(section.lines)
  const highlightStep = getEssayHighlightStep(section.highlightStep)
  const titleY = y + 12
  const logoPosition =
    definition.header.logoAlignment === 'center'
      ? 'top-center'
      : definition.header.logoAlignment === 'right'
        ? 'top-right'
        : 'top-left'
  const logoBox = null
  const qrBox = null
  const headerTopY = titleY + 28
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
            y: headerTopY + rowIndex * 19,
            labelWidth,
            lineX: cursorX + labelWidth + 5,
            lineWidth: Math.max(28, fieldWidth - labelWidth - 14),
          }
          cursorX += fieldWidth
          return layout
        })
      })
    : []
  const afterHeaderY = section.showHeader && headerRows.length ? headerTopY + headerRows.length * 19 + 3 : titleY + 20
  const essayTitleLabelY = afterHeaderY + 9
  const essayTitleLineY = essayTitleLabelY + 1
  const titleLineWidth = Math.min(width * 0.62, 250)
  const titleLineX = x + (width - titleLineWidth) / 2
  const writingTopY = section.showEssayTitleField ? essayTitleLineY + 21 : afterHeaderY + 14
  const availableWritingHeight = Math.max(180, bottomY - writingTopY)
  const lineSpacing = Math.min(18, Math.max(10, availableWritingHeight / lines))
  const numberColumnWidth = section.style === 'box' ? 34 : 26
  const lineX = section.style === 'box' ? x + numberColumnWidth : x + numberColumnWidth + 8
  const lineWidth = section.style === 'box' ? width - numberColumnWidth : width - numberColumnWidth - 8
  const answerBoxInsetX = 0
  const answerBoxPaddingY = section.style === 'box' ? 0 : 8
  const answerBoxHeight = section.style === 'box' ? lineSpacing * lines : Math.max(24, (lines - 1) * lineSpacing + answerBoxPaddingY * 2)
  const answerBox = {
    x: section.style === 'box' ? x : lineX - answerBoxInsetX,
    y: writingTopY - answerBoxPaddingY,
    width: section.style === 'box' ? width : lineWidth + answerBoxInsetX * 2,
    height: answerBoxHeight,
  }
  const lineLayouts = Array.from({ length: lines }, (_, index) => {
    const number = index + 1
    const rowTopY = section.style === 'box' ? answerBox.y + index * lineSpacing : writingTopY + index * lineSpacing - 12
    const rowBottomY = section.style === 'box' ? rowTopY + lineSpacing : writingTopY + index * lineSpacing
    const lineY = section.style === 'box' ? rowBottomY : writingTopY + index * lineSpacing
    return {
      number,
      numberX: section.style === 'box' ? answerBox.x + numberColumnWidth / 2 : x + numberColumnWidth - 6,
      numberY: section.style === 'box' ? rowTopY + lineSpacing * 0.64 : lineY - 3,
      rowTopY,
      rowBottomY,
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
    showLogo: definition.header.showInstitutionLogo,
    logoPosition,
    showQRCode: definition.identification.showExamCode,
    qrPosition: 'bottom-right',
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
    essayTitleLineX: titleLineX,
    essayTitleLineWidth: titleLineWidth,
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
          const manualQuestionMeta = renderModel.manualSectionQuestionMap.get(section.order)
          return {
            kind: 'open' as const,
            id: section.id,
            label: section.label,
            lines: section.lines,
            lineStyle: section.lineStyle,
            displayQuestionNumber: manualQuestionMeta?.questionNumber ?? null,
            linkedQuestionNumber: section.linkedToMainQuestion ? section.linkedQuestionNumber : null,
          }
        }

        if (section.sectionType === 'math') {
          const manualQuestionMeta = renderModel.manualSectionQuestionMap.get(section.order)
            return {
              kind: 'math' as const,
              id: section.id,
              columns: section.columns,
              showTopInputRow: section.showTopInputRow,
              showColumnHeaders: section.showColumnHeaders,
              columnHeaders: section.columnHeaders,
              showColumnSeparators: section.showColumnSeparators,
              separatorMode: section.separatorMode,
              columnSeparators: section.columnSeparators,
              displayQuestionNumber: manualQuestionMeta?.questionNumber ?? null,
              linkedQuestionNumber: section.linkedToMainQuestion ? section.linkedQuestionNumber : null,
            }
        }

        if (section.sectionType === 'image') {
          const manualQuestionMeta = renderModel.manualSectionQuestionMap.get(section.order)
          return {
            kind: 'image' as const,
            id: section.id,
            imageSrc: section.imageSrc,
            imageName: section.imageName,
            imageWidth: section.imageWidth,
            imageHeight: section.imageHeight,
            size: section.size,
            align: section.align,
            displayQuestionNumber: manualQuestionMeta?.questionNumber ?? null,
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
          section.kind === 'image' ||
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
      const manualQuestionMeta = renderModel.manualSectionQuestionMap.get(section.order)
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
        displayQuestionNumber: manualQuestionMeta?.questionNumber ?? null,
        linkedQuestionNumber: section.linkedToMainQuestion ? section.linkedQuestionNumber : null,
      })
      return
    }

    if (section.sectionType === 'math') {
      const manualQuestionMeta = renderModel.manualSectionQuestionMap.get(section.order)
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
        separatorMode: section.separatorMode,
        columnSeparators: section.columnSeparators,
        displayQuestionNumber: manualQuestionMeta?.questionNumber ?? null,
        linkedQuestionNumber: section.linkedToMainQuestion ? section.linkedQuestionNumber : null,
      })
      return
    }

    if (section.sectionType === 'image') {
      const manualQuestionMeta = renderModel.manualSectionQuestionMap.get(section.order)
      if (pendingObjectiveGroup) {
        flowSections.push(pendingObjectiveGroup)
      }
      pendingObjectiveGroup = null
      flowSections.push({
        kind: 'image',
        id: section.id,
        imageSrc: section.imageSrc,
        imageName: section.imageName,
        imageWidth: section.imageWidth,
        imageHeight: section.imageHeight,
        size: section.size,
        align: section.align,
        displayQuestionNumber: manualQuestionMeta?.questionNumber ?? null,
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
      currentPage.images.length === 0 &&
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
    currentPage.images.length > 0 ||
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

      const mathSymbols = getMathAllowedCharacters(section.columnSeparators)

      currentPage.mathBlocks.push({
        id: section.id,
        columns: metrics.safeColumns,
        showTopInputRow: section.showTopInputRow,
        showColumnHeaders: section.showColumnHeaders,
        columnHeaders: Array.from({ length: metrics.safeColumns }, (_, index) => section.columnHeaders[index] ?? ''),
        showColumnSeparators: section.showColumnSeparators,
        separatorMode: section.separatorMode,
        columnSeparators: Array.from({ length: metrics.safeColumns }, (_, index) => section.columnSeparators[index] ?? ''),
        x: blockX,
        y: sectionY,
        width: blockWidth,
        height: metrics.totalHeight,
        displayQuestionNumber: section.displayQuestionNumber,
        linkedQuestionNumber: section.linkedQuestionNumber,
        titleY,
        headerY,
        topInputY,
        separatorY,
        gridTopY,
        columnXs: Array.from({ length: metrics.safeColumns }, (_, index) => gridLeftX + index * columnSpacing),
        rows: mathSymbols.map((symbol, rowIndex) => ({
          symbol,
          y: gridTopY + rowIndex * metrics.rowSpacing,
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
      currentPage.essays.push(createEssayLayout(section, zones, state))
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
      const openTitleMetrics = getOpenAnswerTitleMetrics(section.displayQuestionNumber)
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
        displayQuestionNumber: section.displayQuestionNumber,
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
        section.columnSeparators,
        section.showTopInputRow,
        section.showColumnHeaders,
        section.displayQuestionNumber,
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

    if (section.kind === 'image') {
      const imageAreaX = layoutArea.left
      const imageAreaWidth = layoutArea.right - layoutArea.left
      const naturalImageWidth = section.imageWidth ?? imageAreaWidth
      const naturalImageHeight = section.imageHeight ?? Math.max(90, resolvedRowOffset * 6.2)
      const aspectRatio = naturalImageWidth > 0 && naturalImageHeight > 0 ? naturalImageWidth / naturalImageHeight : 16 / 9
      const requestedImageWidth =
        section.size === 'auto'
          ? Math.min(naturalImageWidth, imageAreaWidth)
          : imageAreaWidth * getImageSizeRatio(section.size)
      const requestedImageHeight = requestedImageWidth / aspectRatio
      const maxImageHeight = Math.max(90, pageUsableHeight - (section.displayQuestionNumber ? 35 : 18))
      const imageHeight = Math.min(requestedImageHeight, maxImageHeight)
      const imageWidth = Math.min(requestedImageWidth, imageHeight * aspectRatio)
      const imageMetrics = getImageSectionMetrics(resolvedRowOffset, section.displayQuestionNumber, imageHeight)
      if (hasContentOnPage() && currentY + imageMetrics.totalHeight > pageBottomY) {
        pushCurrentPage()
      }

      const imageX =
        section.align === 'left'
          ? imageAreaX
          : section.align === 'right'
            ? imageAreaX + imageAreaWidth - imageWidth
            : imageAreaX + (imageAreaWidth - imageWidth) / 2
      const sectionY = currentY + imageMetrics.topGap
      const imageBoxY = sectionY + imageMetrics.titleHeight + imageMetrics.titleGap

      currentPage.images.push({
        id: section.id,
        imageSrc: section.imageSrc,
        imageName: section.imageName,
        imageWidth: section.imageWidth,
        imageHeight: section.imageHeight,
        size: section.size,
        align: section.align,
        displayQuestionNumber: section.displayQuestionNumber,
        linkedQuestionNumber: section.linkedQuestionNumber,
        x: imageX,
        y: sectionY,
        width: imageWidth,
        height: imageMetrics.totalHeight,
        imageBoxY,
        imageBoxHeight: imageMetrics.imageBoxHeight,
      })
      currentY += imageMetrics.totalHeight

      if (sectionIndex < flowSections.length - 1) {
        currentY += imageMetrics.afterGap
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
