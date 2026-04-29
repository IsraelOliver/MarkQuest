import type {
  CardEssaySection,
  CardImageSection,
  CardLabelSection,
  CardMathSection,
  CardNumberingFormat,
  CardObjectiveSection,
  CardOpenSection,
  CardPageBreakSection,
  CardQuestionStyle,
  CardSignatureSection,
  CardSpacerSection,
  CardTemplateDefinition,
  CardTemplateSection,
} from '../types/omr'
import { isValidOptionLabel, normalizeOptionLabels } from './optionLabels'
import { clampQuestionTotal, MAX_QUESTIONS } from './questionLimits'

export type QuestionBlockSegment = {
  startQuestion: number
  endQuestion: number
  title: string
  blockIndex: number | null
}

type QuestionBlockFallbackConfig = Pick<CardTemplateDefinition, 'choicesPerQuestion' | 'optionLabels'> & {
  numberingFormat: CardNumberingFormat
}

export type QuestionBlockQuestionConfig = {
  blockIndex: number | null
  block: CardObjectiveSection | null
  blockStartQuestion: number
  localQuestionIndex: number
  choicesPerQuestion: 2 | 3 | 4 | 5
  optionLabels: string[]
  numberingFormat: CardNumberingFormat
  questionStyle: CardQuestionStyle
}

export type NormalizedObjectiveSection = {
  id: string
  order: number
  sectionType: 'objective'
  readMode: 'answers'
  title: string
  startQuestion: number
  endQuestion: number
  alternativesCount: 2 | 3 | 4 | 5
  alternativeLabels: string[]
  numberingFormat: CardNumberingFormat
  questionStyle: CardQuestionStyle
  questionNumbers: number[]
}

export type NormalizedLabelSection = {
  id: string
  order: number
  sectionType: 'label'
  readMode: 'ignored'
  text: string
  align: 'left' | 'center' | 'right'
  size: 'sm' | 'md' | 'lg'
}

export type NormalizedOpenSection = {
  id: string
  order: number
  sectionType: 'open'
  readMode: 'manual'
  label: string
  lines: number
  lineStyle: 'line' | 'box'
  linkedToMainQuestion: boolean
  linkedQuestionNumber: number | null
  markerLabel: string
}

export type NormalizedMathSection = {
  id: string
  order: number
  sectionType: 'math'
  readMode: 'manual'
  columns: number
  showTopInputRow: boolean
  showColumnHeaders: boolean
  columnHeaders: string[]
  showColumnSeparators: boolean
  columnSeparators: string[]
  linkedToMainQuestion: boolean
  linkedQuestionNumber: number | null
  markerLabel: string
}

export type NormalizedImageSection = {
  id: string
  order: number
  sectionType: 'image'
  readMode: 'ignored' | 'manual'
  imageSrc: string | null
  imageName: string | null
  imageWidth: number | null
  imageHeight: number | null
  size: 'auto' | '25' | '50' | '75' | '100'
  align: 'left' | 'center' | 'right'
  isQuestion: boolean
  linkedToMainQuestion: boolean
  linkedQuestionNumber: number | null
  markerLabel: string
}

export type NormalizedEssaySection = {
  id: string
  order: number
  sectionType: 'essay'
  readMode: 'manual'
  title: string
  style: 'lines' | 'box'
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
  logoPosition: 'top-left' | 'top-center' | 'top-right'
  showQRCode: boolean
  qrPosition: 'bottom-right' | 'top-right'
}

export type NormalizedSpacerSection = {
  id: string
  order: number
  sectionType: 'spacer'
  readMode: 'ignored'
  size: 'sm' | 'md' | 'lg'
}

export type NormalizedPageBreakSection = {
  id: string
  order: number
  sectionType: 'pageBreak'
  readMode: 'ignored'
}

export type NormalizedSignatureSection = {
  id: string
  order: number
  sectionType: 'signature'
  readMode: 'ignored'
  label: string
  align: 'left' | 'center' | 'right'
  lineWidth: 'sm' | 'md' | 'lg'
}

export type NormalizedTemplateSection =
  | NormalizedObjectiveSection
  | NormalizedOpenSection
  | NormalizedMathSection
  | NormalizedImageSection
  | NormalizedEssaySection
  | NormalizedLabelSection
  | NormalizedSpacerSection
  | NormalizedPageBreakSection
  | NormalizedSignatureSection

export type ResolvedQuestion = {
  questionNumber: number
  blockId: string
  blockOrder: number
  blockTitle: string
  blockStartQuestion: number
  localQuestionIndex: number
  alternativesCount: 2 | 3 | 4 | 5
  alternativeLabels: string[]
  numberingFormat: CardNumberingFormat
  questionStyle: CardQuestionStyle
}

export type NormalizedRenderModel = {
  sections: NormalizedTemplateSection[]
  blocks: NormalizedObjectiveSection[]
  questions: ResolvedQuestion[]
  logicalQuestions: LogicalQuestion[]
  logicalQuestionMap: Map<number, LogicalQuestion>
  manualQuestionLinks: ManualQuestionLink[]
  manualQuestionLinksByQuestion: Map<number, ManualQuestionLink[]>
  manualSectionQuestionMap: Map<number, ManualSectionQuestionMeta>
  totalRenderedQuestions: number
  lastRenderedQuestion: number
  hasGaps: boolean
  hasOverlap: boolean
  outOfRangeQuestions: number[]
  gapRanges: Array<{ startQuestion: number; endQuestion: number }>
  overlappingQuestions: number[]
}

export type ManualQuestionLink = {
  sectionId: string
  sectionType: 'open' | 'math' | 'image'
  linkedQuestionNumber: number
  markerLabel: string
}

export type ManualSectionQuestionMeta = {
  sectionId: string
  sectionOrder: number
  sectionType: 'open' | 'math' | 'image'
  questionNumber: number
  linkedToMainQuestion: boolean
}

export type LogicalQuestionType = 'objective' | 'math' | 'open' | 'image'

export type LogicalQuestionAnswerModel =
  | {
      type: 'objective'
      answer: null
    }
  | {
      type: 'math'
      answer: null
      columns: number
    }
  | {
      type: 'open'
      answer: null
    }
  | {
      type: 'image'
      answer: null
    }

export type LogicalQuestion = {
  number: number
  type: LogicalQuestionType
  sourceSectionId: string
  linkedSectionId?: string
  markerLabel?: string
  answerModel: LogicalQuestionAnswerModel
}

export type LogicalQuestionExport = {
  number: number
  type: LogicalQuestionType
  sectionId: string
}

export function isObjectiveSection(section: CardTemplateSection): section is CardObjectiveSection {
  return section.sectionType === 'objective'
}

export function isOpenSection(section: CardTemplateSection): section is CardOpenSection {
  return section.sectionType === 'open'
}

export function isMathSection(section: CardTemplateSection): section is CardMathSection {
  return section.sectionType === 'math'
}

export function isImageSection(section: CardTemplateSection): section is CardImageSection {
  return section.sectionType === 'image'
}

export function isEssaySection(section: CardTemplateSection): section is CardEssaySection {
  return section.sectionType === 'essay'
}

export function isLabelSection(section: CardTemplateSection): section is CardLabelSection {
  return section.sectionType === 'label'
}

export function isSpacerSection(section: CardTemplateSection): section is CardSpacerSection {
  return section.sectionType === 'spacer'
}

export function isPageBreakSection(section: CardTemplateSection): section is CardPageBreakSection {
  return section.sectionType === 'pageBreak'
}

export function isSignatureSection(section: CardTemplateSection): section is CardSignatureSection {
  return section.sectionType === 'signature'
}

function createSectionId(index: number, prefix: 'objective' | 'open' | 'math' | 'image' | 'essay' | 'label' | 'spacer' | 'page-break' | 'signature') {
  return `section-${prefix}-${index + 1}`
}

function normalizeNumberingFormat(value: string | undefined, fallback: CardNumberingFormat) {
  return value === 'numericAlpha' || value === 'alphaNumeric' || value === 'numericLower' || value === 'numericDash'
    ? value
    : fallback
}

function normalizeLabelAlign(value: string | undefined): CardLabelSection['align'] {
  return value === 'center' || value === 'right' ? value : 'left'
}

function normalizeLabelSize(value: string | undefined): CardLabelSection['size'] {
  return value === 'sm' || value === 'lg' ? value : 'md'
}

function normalizeSpacerSize(value: string | undefined): CardSpacerSection['size'] {
  return value === 'sm' || value === 'lg' ? value : 'md'
}

function normalizeSignatureAlign(value: string | undefined): CardSignatureSection['align'] {
  return value === 'center' || value === 'right' ? value : 'left'
}

function normalizeSignatureLineWidth(value: string | undefined): CardSignatureSection['lineWidth'] {
  return value === 'sm' || value === 'lg' ? value : 'md'
}

function normalizeOpenLineStyle(value: string | undefined): CardOpenSection['lineStyle'] {
  return value === 'box' ? 'box' : 'line'
}

function normalizeOpenLines(value: number | undefined) {
  return Math.min(20, Math.max(1, Math.round(value ?? 5)))
}

function normalizeLinkedQuestionNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  const rounded = Math.round(Number(value))
  return Number.isFinite(rounded) && rounded > 0 ? rounded : null
}

function normalizeMarkerLabel(value: string | undefined, fallback: string) {
  return (value ?? fallback).slice(0, 12)
}

function normalizeImageSize(value: string | undefined): CardImageSection['size'] {
  if (value === 'auto') return 'auto'
  return value === '25' || value === '75' || value === '100' ? value : '50'
}

function normalizeImageAlign(value: string | undefined): CardImageSection['align'] {
  return value === 'left' || value === 'right' ? value : 'center'
}

function normalizeImageDimension(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  const rounded = Math.round(Number(value))
  return Number.isFinite(rounded) && rounded > 0 ? rounded : null
}

function normalizeMathColumns(value: number | undefined) {
  return Math.min(10, Math.max(1, Math.round(value ?? 3)))
}

function normalizeMathColumnHeader(value: string | undefined) {
  return (value ?? '').replace(/[\r\n\t]/g, ' ').slice(0, 3)
}

function normalizeMathColumnHeaders(value: string[] | undefined, columns: number) {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length: columns }, (_, index) => normalizeMathColumnHeader(source[index]))
}

function normalizeMathColumnSeparator(value: string | undefined) {
  return value === '.' || value === ',' || value === '-' ? value : ''
}

function normalizeMathColumnSeparators(value: string[] | undefined, columns: number) {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length: columns }, (_, index) => normalizeMathColumnSeparator(source[index]))
}

function normalizeEssayLines(value: number | undefined) {
  return Math.min(60, Math.max(10, Math.round(value ?? 30)))
}

function normalizeEssayHighlightStep(value: number | undefined) {
  return Math.min(20, Math.max(0, Math.round(value ?? 5)))
}

function normalizeEssayStyle(value: string | undefined): CardEssaySection['style'] {
  return value === 'box' ? 'box' : 'lines'
}

function normalizeEssayLogoPosition(value: string | undefined): CardEssaySection['logoPosition'] {
  return value === 'top-center' || value === 'top-right' ? value : 'top-left'
}

function normalizeEssayQrPosition(value: string | undefined): CardEssaySection['qrPosition'] {
  return value === 'top-right' ? 'top-right' : 'bottom-right'
}

function normalizeObjectiveSection(
  section: Partial<CardObjectiveSection>,
  index: number,
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
): CardObjectiveSection {
  const choicesPerQuestion =
    section.choicesPerQuestion === 2 ||
    section.choicesPerQuestion === 3 ||
    section.choicesPerQuestion === 4 ||
    section.choicesPerQuestion === 5
      ? section.choicesPerQuestion
      : fallbackConfig.choicesPerQuestion

  const startQuestion = Math.min(totalQuestions, Math.max(1, Math.round(section.startQuestion ?? 1)))
  const endQuestion = Math.min(totalQuestions, Math.max(startQuestion, Math.round(section.endQuestion ?? startQuestion)))

  return {
    id: section.id?.trim() || createSectionId(index, 'objective'),
    sectionType: 'objective',
    readMode: 'answers',
    startQuestion,
    endQuestion,
    title: section.title ?? '',
    choicesPerQuestion,
    optionLabels: normalizeOptionLabels(section.optionLabels, choicesPerQuestion),
    numberingFormat: normalizeNumberingFormat(section.numberingFormat, fallbackConfig.numberingFormat),
  }
}

function normalizeLabelSection(section: Partial<CardLabelSection>, index: number): CardLabelSection {
  return {
    id: section.id?.trim() || createSectionId(index, 'label'),
    sectionType: 'label',
    readMode: 'ignored',
    text: section.text ?? '',
    align: normalizeLabelAlign(section.align),
    size: normalizeLabelSize(section.size),
  }
}

function normalizeOpenSection(section: Partial<CardOpenSection>, index: number): CardOpenSection {
  return {
    id: section.id?.trim() || createSectionId(index, 'open'),
    sectionType: 'open',
    readMode: 'manual',
    label: section.label ?? 'Resposta',
    lines: normalizeOpenLines(section.lines),
    lineStyle: normalizeOpenLineStyle(section.lineStyle),
    linkedToMainQuestion: section.linkedToMainQuestion ?? false,
    linkedQuestionNumber: normalizeLinkedQuestionNumber(section.linkedQuestionNumber),
    markerLabel: normalizeMarkerLabel(section.markerLabel, 'TIPO D'),
  }
}

function normalizeMathSection(section: Partial<CardMathSection>, index: number): CardMathSection {
  const columns = normalizeMathColumns(section.columns)

  return {
    id: section.id?.trim() || createSectionId(index, 'math'),
    sectionType: 'math',
    readMode: 'manual',
    columns,
    showTopInputRow: section.showTopInputRow ?? true,
    showColumnHeaders: section.showColumnHeaders ?? false,
    columnHeaders: normalizeMathColumnHeaders(section.columnHeaders, columns),
    showColumnSeparators: section.showColumnSeparators ?? false,
    columnSeparators: normalizeMathColumnSeparators(section.columnSeparators, columns),
    linkedToMainQuestion: section.linkedToMainQuestion ?? false,
    linkedQuestionNumber: normalizeLinkedQuestionNumber(section.linkedQuestionNumber),
    markerLabel: normalizeMarkerLabel(section.markerLabel, 'TIPO B'),
  }
}

function normalizeImageSection(
  section: Partial<CardImageSection> & { layoutMode?: 'natural' | 'fullWidth' },
  index: number,
): CardImageSection {
  const isQuestion = section.isQuestion ?? false
  const size = normalizeImageSize(section.size)

  return {
    id: section.id?.trim() || createSectionId(index, 'image'),
    sectionType: 'image',
    readMode: isQuestion ? 'manual' : 'ignored',
    imageSrc: section.imageSrc ?? null,
    imageName: section.imageName ?? null,
    imageWidth: normalizeImageDimension(section.imageWidth),
    imageHeight: normalizeImageDimension(section.imageHeight),
    size,
    align: normalizeImageAlign(section.align),
    isQuestion,
    linkedToMainQuestion: section.linkedToMainQuestion ?? false,
    linkedQuestionNumber: normalizeLinkedQuestionNumber(section.linkedQuestionNumber),
    markerLabel: normalizeMarkerLabel(section.markerLabel, 'IMAGEM'),
    mimeType: section.mimeType,
    fileSize: section.fileSize,
    optimized: section.optimized,
    originalName: section.originalName,
  }
}

function normalizeEssaySection(section: Partial<CardEssaySection> & { showHeaderFields?: boolean }, index: number): CardEssaySection {
  return {
    id: section.id?.trim() || createSectionId(index, 'essay'),
    sectionType: 'essay',
    readMode: 'manual',
    title: section.title ?? 'FOLHA DE REDAÇÃO',
    style: normalizeEssayStyle(section.style),
    lines: normalizeEssayLines(section.lines),
    highlightStep: normalizeEssayHighlightStep(section.highlightStep),
    showHeader: section.showHeader ?? section.showHeaderFields ?? true,
    showEssayTitleField: section.showEssayTitleField ?? true,
    showStudentName: section.showStudentName ?? true,
    showClass: section.showClass ?? true,
    showTestName: section.showTestName ?? true,
    showCode: section.showCode ?? true,
    showTeacher: section.showTeacher ?? false,
    showShift: section.showShift ?? false,
    showDate: section.showDate ?? false,
    showLogo: section.showLogo ?? true,
    logoPosition: normalizeEssayLogoPosition(section.logoPosition),
    showQRCode: section.showQRCode ?? true,
    qrPosition: normalizeEssayQrPosition(section.qrPosition),
  }
}

function normalizeSpacerSection(section: Partial<CardSpacerSection>, index: number): CardSpacerSection {
  return {
    id: section.id?.trim() || createSectionId(index, 'spacer'),
    sectionType: 'spacer',
    readMode: 'ignored',
    size: normalizeSpacerSize(section.size),
  }
}

function normalizePageBreakSection(section: Partial<CardPageBreakSection>, index: number): CardPageBreakSection {
  return {
    id: section.id?.trim() || createSectionId(index, 'page-break'),
    sectionType: 'pageBreak',
    readMode: 'ignored',
  }
}

function normalizeSignatureSection(section: Partial<CardSignatureSection>, index: number): CardSignatureSection {
  return {
    id: section.id?.trim() || createSectionId(index, 'signature'),
    sectionType: 'signature',
    readMode: 'ignored',
    label: section.label ?? 'Assinatura do aluno',
    align: normalizeSignatureAlign(section.align),
    lineWidth: normalizeSignatureLineWidth(section.lineWidth),
  }
}

export function createObjectiveSection(
  index: number,
  startQuestion: number,
  endQuestion: number,
  fallbackConfig: QuestionBlockFallbackConfig,
  overrides: Partial<CardObjectiveSection> = {},
): CardObjectiveSection {
  return normalizeObjectiveSection(
    {
      id: overrides.id ?? createSectionId(index, 'objective'),
      title: overrides.title ?? `Seção ${index + 1}`,
      startQuestion,
      endQuestion,
      choicesPerQuestion: overrides.choicesPerQuestion ?? fallbackConfig.choicesPerQuestion,
      optionLabels: overrides.optionLabels ?? fallbackConfig.optionLabels,
      numberingFormat: overrides.numberingFormat ?? fallbackConfig.numberingFormat,
    },
    index,
    Math.max(endQuestion, 1),
    fallbackConfig,
  )
}

export function createLabelSection(index: number, overrides: Partial<CardLabelSection> = {}): CardLabelSection {
  return normalizeLabelSection(
    {
      id: overrides.id ?? createSectionId(index, 'label'),
      text: overrides.text ?? '',
      align: overrides.align ?? 'left',
      size: overrides.size ?? 'md',
    },
    index,
  )
}

export function createOpenSection(index: number, overrides: Partial<CardOpenSection> = {}): CardOpenSection {
  return normalizeOpenSection(
    {
      id: overrides.id ?? createSectionId(index, 'open'),
      label: overrides.label ?? 'Resposta',
      lines: overrides.lines ?? 5,
      lineStyle: overrides.lineStyle ?? 'line',
      linkedToMainQuestion: overrides.linkedToMainQuestion ?? false,
      linkedQuestionNumber: overrides.linkedQuestionNumber ?? null,
      markerLabel: overrides.markerLabel ?? 'TIPO D',
    },
    index,
  )
}

export function createMathSection(index: number, overrides: Partial<CardMathSection> = {}): CardMathSection {
  return normalizeMathSection(
    {
      id: overrides.id ?? createSectionId(index, 'math'),
      columns: overrides.columns ?? 3,
      showTopInputRow: overrides.showTopInputRow ?? true,
      showColumnHeaders: overrides.showColumnHeaders ?? false,
      columnHeaders: overrides.columnHeaders ?? [],
      showColumnSeparators: overrides.showColumnSeparators ?? false,
      columnSeparators: overrides.columnSeparators ?? [],
      linkedToMainQuestion: overrides.linkedToMainQuestion ?? false,
      linkedQuestionNumber: overrides.linkedQuestionNumber ?? null,
      markerLabel: overrides.markerLabel ?? 'TIPO B',
    },
    index,
  )
}

export function createImageSection(
  index: number,
  overrides: Partial<CardImageSection> & { layoutMode?: 'natural' | 'fullWidth' } = {},
): CardImageSection {
  return normalizeImageSection(
    {
      id: overrides.id ?? createSectionId(index, 'image'),
      imageSrc: overrides.imageSrc ?? null,
      imageName: overrides.imageName ?? null,
      imageWidth: overrides.imageWidth ?? null,
      imageHeight: overrides.imageHeight ?? null,
      size: overrides.size ?? '50',
      align: overrides.align ?? 'center',
      isQuestion: overrides.isQuestion ?? false,
      linkedToMainQuestion: overrides.linkedToMainQuestion ?? false,
      linkedQuestionNumber: overrides.linkedQuestionNumber ?? null,
      markerLabel: overrides.markerLabel ?? 'IMAGEM',
    },
    index,
  )
}

export function createEssaySection(index: number, overrides: Partial<CardEssaySection> = {}): CardEssaySection {
  return normalizeEssaySection(
    {
      id: overrides.id ?? createSectionId(index, 'essay'),
      title: overrides.title ?? 'FOLHA DE REDAÇÃO',
      style: overrides.style ?? 'lines',
      lines: overrides.lines ?? 30,
      highlightStep: overrides.highlightStep ?? 5,
      showHeader: overrides.showHeader ?? true,
      showEssayTitleField: overrides.showEssayTitleField ?? true,
      showStudentName: overrides.showStudentName ?? true,
      showClass: overrides.showClass ?? true,
      showTestName: overrides.showTestName ?? true,
      showCode: overrides.showCode ?? true,
      showTeacher: overrides.showTeacher ?? false,
      showShift: overrides.showShift ?? false,
      showDate: overrides.showDate ?? false,
      showLogo: overrides.showLogo ?? true,
      logoPosition: overrides.logoPosition ?? 'top-left',
      showQRCode: overrides.showQRCode ?? true,
      qrPosition: overrides.qrPosition ?? 'bottom-right',
    },
    index,
  )
}

export function createSpacerSection(index: number, overrides: Partial<CardSpacerSection> = {}): CardSpacerSection {
  return normalizeSpacerSection(
    {
      id: overrides.id ?? createSectionId(index, 'spacer'),
      size: overrides.size ?? 'md',
    },
    index,
  )
}

export function createPageBreakSection(index: number, overrides: Partial<CardPageBreakSection> = {}): CardPageBreakSection {
  return normalizePageBreakSection(
    {
      id: overrides.id ?? createSectionId(index, 'page-break'),
    },
    index,
  )
}

export function createSignatureSection(index: number, overrides: Partial<CardSignatureSection> = {}): CardSignatureSection {
  return normalizeSignatureSection(
    {
      id: overrides.id ?? createSectionId(index, 'signature'),
      label: overrides.label ?? 'Assinatura do aluno',
      align: overrides.align ?? 'left',
      lineWidth: overrides.lineWidth ?? 'md',
    },
    index,
  )
}

export function normalizeQuestionBlocks(
  blocks: CardTemplateSection[] | undefined,
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
): CardTemplateSection[] {
  const safeTotalQuestions = Math.max(1, totalQuestions)

  return (blocks ?? []).map((section, index) => {
    if (isLabelSection(section)) {
      return normalizeLabelSection(section, index)
    }

    if (isOpenSection(section)) {
      return normalizeOpenSection(section, index)
    }

    if (isMathSection(section)) {
      return normalizeMathSection(section, index)
    }

    if (isImageSection(section)) {
      return normalizeImageSection(section, index)
    }

    if (isEssaySection(section)) {
      return normalizeEssaySection(section, index)
    }

    if (isSpacerSection(section)) {
      return normalizeSpacerSection(section, index)
    }

    if (isPageBreakSection(section)) {
      return normalizePageBreakSection(section, index)
    }

    if (isSignatureSection(section)) {
      return normalizeSignatureSection(section, index)
    }

    return normalizeObjectiveSection(section, index, safeTotalQuestions, fallbackConfig)
  })
}

function getObjectiveSectionEntries(sections: CardTemplateSection[]) {
  return sections
    .map((section, index) => ({ section, index }))
    .filter((entry): entry is { section: CardObjectiveSection; index: number } => isObjectiveSection(entry.section))
}

function getObjectiveSectionsSorted(sections: CardTemplateSection[]) {
  return getObjectiveSectionEntries(sections).sort(
    (left, right) => left.section.startQuestion - right.section.startQuestion || left.index - right.index,
  )
}

export function getQuestionBlockAtStart(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'showQuestionBlockTitles' | 'questionBlocks'>,
  questionNumber: number,
) {
  if (!definition.enableQuestionBlocks || !definition.showQuestionBlockTitles) return null
  return definition.questionBlocks.find(
    (section) => isObjectiveSection(section) && section.startQuestion === questionNumber,
  ) ?? null
}

export function validateQuestionBlocks(
  blocks: CardTemplateSection[],
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
) {
  const issues: Array<{ code: string; message: string }> = []
  const normalizedSections = normalizeQuestionBlocks(blocks, totalQuestions, fallbackConfig)
  const sortedBlocks = getObjectiveSectionsSorted(normalizedSections)

  sortedBlocks.forEach(({ section: block }, index) => {
    if (block.startQuestion > block.endQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_INVALID_RANGE_${index}`,
        message: `A seção "${block.title}" tem início maior do que o fim.`,
      })
    }

    if (block.endQuestion > totalQuestions) {
      issues.push({
        code: `QUESTION_BLOCK_OUTSIDE_TOTAL_${index}`,
        message: `A seção "${block.title}" ultrapassa o total de questões da prova.`,
      })
    }

    const nextBlock = sortedBlocks[index + 1]?.section
    if (nextBlock && block.endQuestion >= nextBlock.startQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_OVERLAP_${index}`,
        message: `As seções "${block.title}" e "${nextBlock.title}" possuem intervalos sobrepostos.`,
      })
    }

    if (block.optionLabels.length !== block.choicesPerQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_COUNT_${index}`,
        message: `A seção "${block.title}" precisa ter a mesma quantidade de caracteres e alternativas.`,
      })
    }

    const invalidOptionLabels = block.optionLabels.filter((label) => !isValidOptionLabel(label))
    if (invalidOptionLabels.length) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_INVALID_${index}`,
        message: `A seção "${block.title}" usa caracteres de alternativas inválidos.`,
      })
    }

    const duplicatedOptionLabels = new Set(
      block.optionLabels.filter((label, labelIndex) => block.optionLabels.indexOf(label) !== labelIndex),
    )
    if (duplicatedOptionLabels.size > 0) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_DUPLICATE_${index}`,
        message: `A seção "${block.title}" repete caracteres de alternativas.`,
      })
    }
  })

  if (sortedBlocks.length) {
    const coveredQuestions = new Set<number>()
    sortedBlocks.forEach(({ section: block }) => {
      for (let question = block.startQuestion; question <= block.endQuestion; question += 1) {
        coveredQuestions.add(question)
      }
    })

    if (coveredQuestions.size < totalQuestions) {
      issues.push({
        code: 'QUESTION_BLOCKS_WITH_GAPS',
        message: 'Existem questões fora das seções objetivas cadastradas.',
      })
    }
  }

  const coveredObjectiveQuestions = new Set<number>()
  sortedBlocks.forEach(({ section: block }) => {
    for (let question = block.startQuestion; question <= Math.min(block.endQuestion, totalQuestions); question += 1) {
      coveredObjectiveQuestions.add(question)
    }
  })

  const manualLinks = blocks.flatMap((section) => {
    if (!isOpenSection(section) && !isMathSection(section) && !isImageSection(section)) return []
    if (isImageSection(section) && !section.isQuestion) return []
    if (!section.linkedToMainQuestion || section.linkedQuestionNumber === null) return []
    return [{
      sectionId: section.id,
      sectionType: section.sectionType,
      linkedQuestionNumber: section.linkedQuestionNumber,
      markerLabel: section.markerLabel,
    } satisfies ManualQuestionLink]
  })

  const linkCounts = new Map<number, number>()
  manualLinks.forEach((link) => {
    linkCounts.set(link.linkedQuestionNumber, (linkCounts.get(link.linkedQuestionNumber) ?? 0) + 1)
  })

  manualLinks.forEach((link, index) => {
    if (!coveredObjectiveQuestions.has(link.linkedQuestionNumber)) {
      issues.push({
        code: `QUESTION_LINK_MISSING_${index}`,
        message: `A questão informada não existe nas seções objetivas atuais: ${link.linkedQuestionNumber}.`,
      })
    }

    if ((linkCounts.get(link.linkedQuestionNumber) ?? 0) > 1) {
      issues.push({
        code: `QUESTION_LINK_CONFLICT_${index}`,
        message: `Já existe outra seção vinculada à questão ${link.linkedQuestionNumber}.`,
      })
    }
  })

  return issues
}

export function getManualQuestionLinks(
  definition: Pick<CardTemplateDefinition, 'questionBlocks'>,
) {
  const links = definition.questionBlocks.flatMap((section) => {
    if (!isOpenSection(section) && !isMathSection(section) && !isImageSection(section)) return []
    if (isImageSection(section) && !section.isQuestion) return []
    if (!section.linkedToMainQuestion || section.linkedQuestionNumber === null) return []
    return [{
      sectionId: section.id,
      sectionType: section.sectionType,
      linkedQuestionNumber: section.linkedQuestionNumber,
      markerLabel: section.markerLabel,
    } satisfies ManualQuestionLink]
  })

  const byQuestion = new Map<number, ManualQuestionLink[]>()
  links.forEach((link) => {
    byQuestion.set(link.linkedQuestionNumber, [...(byQuestion.get(link.linkedQuestionNumber) ?? []), link])
  })

  return {
    links,
    byQuestion,
  }
}

function getLogicalQuestionTypePriority(type: LogicalQuestionType) {
  if (type === 'math') return 3
  if (type === 'image') return 3
  if (type === 'open') return 2
  return 1
}

function buildLogicalQuestionAnswerModel(
  type: LogicalQuestionType,
  section: NormalizedObjectiveSection | NormalizedOpenSection | NormalizedMathSection | NormalizedImageSection,
): LogicalQuestionAnswerModel {
  if (type === 'math' && section.sectionType === 'math') {
    return {
      type: 'math',
      answer: null,
      columns: section.columns,
    }
  }

  if (type === 'open' && section.sectionType === 'open') {
    return {
      type: 'open',
      answer: null,
    }
  }

  if (type === 'image' && section.sectionType === 'image') {
    return {
      type: 'image',
      answer: null,
    }
  }

  return {
    type: 'objective',
    answer: null,
  }
}

function buildLogicalQuestions(
  questions: ResolvedQuestion[],
  sections: NormalizedTemplateSection[],
) {
  const logicalQuestionMap = new Map<number, LogicalQuestion>()
  const manualSectionQuestionMap = new Map<number, ManualSectionQuestionMeta>()
  const sectionById = new Map(sections.map((section) => [section.id, section] as const))
  const occupiedQuestionNumbers = new Set<number>()

  questions.forEach((question) => {
    const sourceSection = sectionById.get(question.blockId)
    if (!sourceSection || sourceSection.sectionType !== 'objective') return

    occupiedQuestionNumbers.add(question.questionNumber)
    logicalQuestionMap.set(question.questionNumber, {
      number: question.questionNumber,
      type: 'objective',
      sourceSectionId: question.blockId,
      answerModel: buildLogicalQuestionAnswerModel('objective', sourceSection),
    })
  })

  let nextManualQuestionNumber = (questions[questions.length - 1]?.questionNumber ?? 0) + 1

  sections.forEach((section) => {
    if (section.sectionType !== 'open' && section.sectionType !== 'math' && section.sectionType !== 'image') return
    if (section.sectionType === 'image' && !section.isQuestion) return

    if (section.linkedToMainQuestion && section.linkedQuestionNumber !== null) {
      manualSectionQuestionMap.set(section.order, {
        sectionId: section.id,
        sectionOrder: section.order,
        sectionType: section.sectionType,
        questionNumber: section.linkedQuestionNumber,
        linkedToMainQuestion: true,
      })
      occupiedQuestionNumbers.add(section.linkedQuestionNumber)

      const currentLogicalQuestion = logicalQuestionMap.get(section.linkedQuestionNumber)
      if (!currentLogicalQuestion) return

      const nextType = section.sectionType
      if (getLogicalQuestionTypePriority(nextType) < getLogicalQuestionTypePriority(currentLogicalQuestion.type)) return

      logicalQuestionMap.set(section.linkedQuestionNumber, {
        number: currentLogicalQuestion.number,
        type: nextType,
        sourceSectionId: currentLogicalQuestion.sourceSectionId,
        linkedSectionId: section.id,
        markerLabel: section.markerLabel,
        answerModel: buildLogicalQuestionAnswerModel(nextType, section),
      })
      return
    }

    while (occupiedQuestionNumbers.has(nextManualQuestionNumber)) {
      nextManualQuestionNumber += 1
    }

    const autoQuestionNumber = nextManualQuestionNumber
    nextManualQuestionNumber += 1
    occupiedQuestionNumbers.add(autoQuestionNumber)

    manualSectionQuestionMap.set(section.order, {
      sectionId: section.id,
      sectionOrder: section.order,
      sectionType: section.sectionType,
      questionNumber: autoQuestionNumber,
      linkedToMainQuestion: false,
    })

    logicalQuestionMap.set(autoQuestionNumber, {
      number: autoQuestionNumber,
      type: section.sectionType,
      sourceSectionId: section.id,
      answerModel: buildLogicalQuestionAnswerModel(section.sectionType, section),
    })
  })

  const logicalQuestions = [...logicalQuestionMap.values()].sort((left, right) => left.number - right.number)

  return {
    logicalQuestions,
    logicalQuestionMap,
    manualSectionQuestionMap,
  }
}

export function getLogicalQuestionExport(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'totalQuestions' | 'choicesPerQuestion' | 'optionLabels' | 'questionStyle'>,
  maxQuestions = MAX_QUESTIONS,
) {
  const renderModel = buildNormalizedRenderModel(definition, maxQuestions)

  return {
    questions: renderModel.logicalQuestions.map((question) => ({
      number: question.number,
      type: question.type,
      sectionId: question.linkedSectionId ?? question.sourceSectionId,
    } satisfies LogicalQuestionExport)),
  }
}

function getBlockSpan(block: CardObjectiveSection) {
  return Math.max(0, Math.round(block.endQuestion) - Math.round(block.startQuestion))
}

function buildGapRanges(renderedQuestions: number[]) {
  if (!renderedQuestions.length) return []

  const gapRanges: Array<{ startQuestion: number; endQuestion: number }> = []
  let cursor = 1

  renderedQuestions.forEach((questionNumber) => {
    if (questionNumber > cursor) {
      gapRanges.push({ startQuestion: cursor, endQuestion: questionNumber - 1 })
    }
    cursor = questionNumber + 1
  })

  return gapRanges
}

export function buildNormalizedRenderModel(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'totalQuestions' | 'choicesPerQuestion' | 'optionLabels' | 'questionStyle'>,
  maxQuestions = MAX_QUESTIONS,
): NormalizedRenderModel {
  const safeMaxQuestions = clampQuestionTotal(maxQuestions)
  const safeTotalQuestions = clampQuestionTotal(definition.totalQuestions)
  const { links: manualQuestionLinks, byQuestion: manualQuestionLinksByQuestion } = getManualQuestionLinks(definition)

  if (!definition.enableQuestionBlocks) {
    const alternativesCount = definition.choicesPerQuestion
    const alternativeLabels = normalizeOptionLabels(definition.optionLabels, alternativesCount)
    const questionNumbers = Array.from({ length: Math.min(safeTotalQuestions, safeMaxQuestions) }, (_, index) => index + 1)
    const block: NormalizedObjectiveSection = {
      id: 'global',
      order: 1,
      sectionType: 'objective',
      readMode: 'answers',
      title: '',
      startQuestion: questionNumbers[0] ?? 1,
      endQuestion: questionNumbers[questionNumbers.length - 1] ?? safeTotalQuestions,
      alternativesCount,
      alternativeLabels,
      numberingFormat: 'numeric',
      questionStyle: definition.questionStyle,
      questionNumbers,
    }
    const questions = questionNumbers.map((questionNumber) => ({
      questionNumber,
      blockId: block.id,
      blockOrder: block.order,
      blockTitle: block.title,
      blockStartQuestion: block.startQuestion,
      localQuestionIndex: questionNumber - block.startQuestion,
      alternativesCount,
      alternativeLabels,
      numberingFormat: 'numeric' as const,
      questionStyle: definition.questionStyle,
    }))
    const { logicalQuestions, logicalQuestionMap, manualSectionQuestionMap } = buildLogicalQuestions(questions, [block])

    return {
      sections: [block],
      blocks: [block],
      questions,
      logicalQuestions,
      logicalQuestionMap,
      manualQuestionLinks,
      manualQuestionLinksByQuestion,
      manualSectionQuestionMap,
      totalRenderedQuestions: questions.length,
      lastRenderedQuestion: questionNumbers[questionNumbers.length - 1] ?? 0,
      hasGaps: false,
      hasOverlap: false,
      outOfRangeQuestions: [],
      gapRanges: [],
      overlappingQuestions: [],
    }
  }

  const normalizedSections: NormalizedTemplateSection[] = []
  const objectiveBlocks: NormalizedObjectiveSection[] = []
  const seenQuestions = new Set<number>()
  const outOfRangeQuestions = new Set<number>()
  const overlappingQuestions = new Set<number>()
  const resolvedQuestions: ResolvedQuestion[] = []

  definition.questionBlocks.forEach((section, index) => {
    if (isLabelSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'label',
        readMode: 'ignored',
        text: section.text,
        align: section.align,
        size: section.size,
      })
      return
    }

    if (isOpenSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'open',
        readMode: 'manual',
        label: section.label,
        lines: section.lines,
        lineStyle: section.lineStyle,
        linkedToMainQuestion: section.linkedToMainQuestion,
        linkedQuestionNumber: section.linkedQuestionNumber,
        markerLabel: section.markerLabel,
      })
      return
    }

    if (isMathSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'math',
        readMode: 'manual',
        columns: section.columns,
        showTopInputRow: section.showTopInputRow,
        showColumnHeaders: section.showColumnHeaders,
        columnHeaders: section.columnHeaders,
        showColumnSeparators: section.showColumnSeparators,
        columnSeparators: section.columnSeparators,
        linkedToMainQuestion: section.linkedToMainQuestion,
        linkedQuestionNumber: section.linkedQuestionNumber,
        markerLabel: section.markerLabel,
      })
      return
    }

    if (isImageSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'image',
        readMode: section.isQuestion ? 'manual' : 'ignored',
        imageSrc: section.imageSrc,
        imageName: section.imageName,
        imageWidth: section.imageWidth,
        imageHeight: section.imageHeight,
        size: section.size,
        align: section.align,
        isQuestion: section.isQuestion,
        linkedToMainQuestion: section.linkedToMainQuestion,
        linkedQuestionNumber: section.linkedQuestionNumber,
        markerLabel: section.markerLabel,
      })
      return
    }

    if (isEssaySection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'essay',
        readMode: 'manual',
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

    if (isSpacerSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'spacer',
        readMode: 'ignored',
        size: section.size,
      })
      return
    }

    if (isPageBreakSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'pageBreak',
        readMode: 'ignored',
      })
      return
    }

    if (isSignatureSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'signature',
        readMode: 'ignored',
        label: section.label,
        align: section.align,
        lineWidth: section.lineWidth,
      })
      return
    }

    const clampedStart = Math.max(1, Math.round(section.startQuestion))
    const clampedEnd = Math.max(clampedStart, Math.round(section.endQuestion))
    const alternativesCount =
      section.choicesPerQuestion === 2 ||
      section.choicesPerQuestion === 3 ||
      section.choicesPerQuestion === 4 ||
      section.choicesPerQuestion === 5
        ? section.choicesPerQuestion
        : 5
    const alternativeLabels = normalizeOptionLabels(section.optionLabels, alternativesCount)
    const questionNumbers: number[] = []

    for (let questionNumber = clampedStart; questionNumber <= clampedEnd; questionNumber += 1) {
      if (questionNumber > safeMaxQuestions) {
        outOfRangeQuestions.add(questionNumber)
        continue
      }

      if (seenQuestions.has(questionNumber)) {
        overlappingQuestions.add(questionNumber)
        continue
      }

      seenQuestions.add(questionNumber)
      questionNumbers.push(questionNumber)
      resolvedQuestions.push({
        questionNumber,
        blockId: section.id,
        blockOrder: index + 1,
        blockTitle: section.title ?? '',
        blockStartQuestion: clampedStart,
        localQuestionIndex: questionNumber - clampedStart,
        alternativesCount,
        alternativeLabels,
        numberingFormat: normalizeNumberingFormat(section.numberingFormat, 'numeric'),
        questionStyle: definition.questionStyle,
      })
    }

    const normalizedBlock: NormalizedObjectiveSection = {
      id: section.id,
      order: index + 1,
      sectionType: 'objective',
      readMode: 'answers',
      title: section.title ?? '',
      startQuestion: clampedStart,
      endQuestion: Math.min(clampedEnd, safeMaxQuestions),
      alternativesCount,
      alternativeLabels,
      numberingFormat: normalizeNumberingFormat(section.numberingFormat, 'numeric'),
      questionStyle: definition.questionStyle,
      questionNumbers,
    }

    objectiveBlocks.push(normalizedBlock)
    normalizedSections.push(normalizedBlock)
  })

  const sortedRenderedQuestions = [...resolvedQuestions].sort((left, right) => left.questionNumber - right.questionNumber)
  const renderedQuestionNumbers = sortedRenderedQuestions.map((question) => question.questionNumber)
  const lastRenderedQuestion = renderedQuestionNumbers[renderedQuestionNumbers.length - 1] ?? 0
  const gapRanges = buildGapRanges(renderedQuestionNumbers)
  const { logicalQuestions, logicalQuestionMap, manualSectionQuestionMap } = buildLogicalQuestions(
    sortedRenderedQuestions,
    normalizedSections,
  )

  return {
    sections: normalizedSections,
    blocks: objectiveBlocks,
    questions: sortedRenderedQuestions,
    logicalQuestions,
    logicalQuestionMap,
    manualQuestionLinks,
    manualQuestionLinksByQuestion,
    manualSectionQuestionMap,
    totalRenderedQuestions: sortedRenderedQuestions.length,
    lastRenderedQuestion,
    hasGaps: gapRanges.length > 0,
    hasOverlap: overlappingQuestions.size > 0,
    outOfRangeQuestions: [...outOfRangeQuestions].sort((left, right) => left - right),
    gapRanges,
    overlappingQuestions: [...overlappingQuestions].sort((left, right) => left - right),
  }
}

export function recalculateQuestionBlocksFromIndex(
  blocks: CardTemplateSection[] | undefined,
  changedIndex: number,
  maxQuestions = MAX_QUESTIONS,
) {
  const nextSections = structuredClone(blocks ?? [])
  const objectiveEntries = getObjectiveSectionEntries(nextSections)
  if (!objectiveEntries.length) return nextSections

  const changedObjectivePosition = objectiveEntries.findIndex(({ index }) => index === changedIndex)
  if (changedObjectivePosition === -1) return nextSections

  objectiveEntries[0].section.startQuestion = 1
  objectiveEntries[0].section.endQuestion = Math.min(maxQuestions, Math.max(1, objectiveEntries[0].section.endQuestion))
  if (objectiveEntries[0].section.endQuestion < objectiveEntries[0].section.startQuestion) {
    objectiveEntries[0].section.endQuestion = objectiveEntries[0].section.startQuestion
  }

  for (let position = Math.max(1, changedObjectivePosition + 1); position < objectiveEntries.length; position += 1) {
    const previousBlock = objectiveEntries[position - 1].section
    const currentBlock = objectiveEntries[position].section
    const currentSpan = getBlockSpan(currentBlock)
    const nextStart = Math.min(maxQuestions, previousBlock.endQuestion + 1)
    currentBlock.startQuestion = nextStart
    currentBlock.endQuestion = Math.min(maxQuestions, nextStart + currentSpan)
    if (currentBlock.endQuestion < currentBlock.startQuestion) {
      currentBlock.endQuestion = currentBlock.startQuestion
    }
  }

  return nextSections
}

export function applyQuestionBlockBoundaryChange(
  blocks: CardTemplateSection[] | undefined,
  index: number,
  field: 'startQuestion' | 'endQuestion',
  value: number,
  maxQuestions = MAX_QUESTIONS,
) {
  const nextSections = structuredClone(blocks ?? [])
  const objectiveEntries = getObjectiveSectionEntries(nextSections)
  const objectivePosition = objectiveEntries.findIndex((entry) => entry.index === index)
  const currentEntry = objectiveEntries[objectivePosition]
  if (!currentEntry) return nextSections

  const block = currentEntry.section
  if (field === 'startQuestion') {
    const lockedStart = objectivePosition === 0 ? 1 : objectiveEntries[objectivePosition - 1].section.endQuestion + 1
    const span = getBlockSpan(block)
    block.startQuestion = Math.min(maxQuestions, Math.max(lockedStart, value))
    block.endQuestion = Math.min(maxQuestions, block.startQuestion + span)
  } else {
    const minimumEnd =
      objectivePosition === 0 ? Math.max(block.startQuestion, 1) : Math.max(block.startQuestion, objectiveEntries[objectivePosition - 1].section.endQuestion + 1)
    block.endQuestion = Math.min(maxQuestions, Math.max(minimumEnd, value))
  }

  if (block.endQuestion < block.startQuestion) {
    block.endQuestion = block.startQuestion
  }

  return recalculateQuestionBlocksFromIndex(nextSections, index, maxQuestions)
}

export function getQuestionBlockMeta(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks'>,
  questionNumber: number,
) {
  const blocks = definition.enableQuestionBlocks ? definition.questionBlocks.filter(isObjectiveSection) : []
  const blockIndex = blocks.findIndex(
    (block) => questionNumber >= block.startQuestion && questionNumber <= block.endQuestion,
  )

  if (blockIndex >= 0) {
    const block = blocks[blockIndex]
    return {
      blockIndex,
      suffix: String.fromCharCode(65 + blockIndex),
      localQuestionNumber: questionNumber - block.startQuestion + 1,
      block,
    }
  }

  return {
    blockIndex: 0,
    suffix: 'A',
    localQuestionNumber: questionNumber,
    block: null,
  }
}

export function getQuestionBlockQuestionConfig(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'choicesPerQuestion' | 'optionLabels' | 'questionStyle'>,
  questionNumber: number,
): QuestionBlockQuestionConfig {
  if (!definition.enableQuestionBlocks) {
    return {
      blockIndex: null,
      block: null,
      blockStartQuestion: 1,
      localQuestionIndex: Math.max(0, questionNumber - 1),
      choicesPerQuestion: definition.choicesPerQuestion,
      optionLabels: normalizeOptionLabels(definition.optionLabels, definition.choicesPerQuestion),
      numberingFormat: 'numeric',
      questionStyle: definition.questionStyle,
    }
  }

  const objectiveBlocks = definition.questionBlocks.filter(isObjectiveSection)
  const blockIndex = objectiveBlocks.findIndex(
    (block) => questionNumber >= block.startQuestion && questionNumber <= block.endQuestion,
  )
  const block = blockIndex >= 0 ? objectiveBlocks[blockIndex] : null

  if (!block) {
    return {
      blockIndex: null,
      block: null,
      blockStartQuestion: 1,
      localQuestionIndex: Math.max(0, questionNumber - 1),
      choicesPerQuestion: definition.choicesPerQuestion,
      optionLabels: normalizeOptionLabels(definition.optionLabels, definition.choicesPerQuestion),
      numberingFormat: 'numeric',
      questionStyle: definition.questionStyle,
    }
  }

  return {
    blockIndex,
    block,
    blockStartQuestion: block.startQuestion,
    localQuestionIndex: Math.max(0, questionNumber - block.startQuestion),
    choicesPerQuestion: block.choicesPerQuestion,
    optionLabels: normalizeOptionLabels(block.optionLabels, block.choicesPerQuestion),
    numberingFormat: normalizeNumberingFormat(block.numberingFormat, 'numeric'),
    questionStyle: definition.questionStyle,
  }
}

export function getMaxQuestionBlockChoices(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'choicesPerQuestion'>,
) {
  if (!definition.enableQuestionBlocks || !definition.questionBlocks.length) {
    return definition.choicesPerQuestion
  }

  return definition.questionBlocks.reduce<2 | 3 | 4 | 5>((maxChoices, section) => {
    if (!isObjectiveSection(section)) return maxChoices
    const safeChoices =
      section.choicesPerQuestion === 2 ||
      section.choicesPerQuestion === 3 ||
      section.choicesPerQuestion === 4 ||
      section.choicesPerQuestion === 5
        ? section.choicesPerQuestion
        : 5
    return safeChoices > maxChoices ? safeChoices : maxChoices
  }, definition.choicesPerQuestion)
}

export function getQuestionBlockSegments(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks'>,
  totalQuestions: number,
): QuestionBlockSegment[] {
  if (totalQuestions <= 0) return []

  if (!definition.enableQuestionBlocks) {
    return [
      {
        startQuestion: 1,
        endQuestion: totalQuestions,
        title: '',
        blockIndex: null,
      },
    ]
  }

  const normalizedBlocks = getObjectiveSectionsSorted(definition.questionBlocks)
  if (!normalizedBlocks.length) {
    return [
      {
        startQuestion: 1,
        endQuestion: totalQuestions,
        title: '',
        blockIndex: null,
      },
    ]
  }

  const segments: QuestionBlockSegment[] = []
  let cursor = 1

  normalizedBlocks.forEach(({ section: block }, blockIndex) => {
    const clampedStart = Math.max(cursor, block.startQuestion)
    const clampedEnd = Math.min(totalQuestions, block.endQuestion)

    if (cursor < clampedStart) {
      segments.push({
        startQuestion: cursor,
        endQuestion: clampedStart - 1,
        title: '',
        blockIndex: null,
      })
    }

    if (clampedEnd >= clampedStart) {
      segments.push({
        startQuestion: clampedStart,
        endQuestion: clampedEnd,
        title: block.title,
        blockIndex,
      })
      cursor = clampedEnd + 1
    }
  })

  if (cursor <= totalQuestions) {
    segments.push({
      startQuestion: cursor,
      endQuestion: totalQuestions,
      title: '',
      blockIndex: null,
    })
  }

  return segments
}

export function appendQuestionBlockWithDistribution(
  blocks: CardTemplateSection[] | undefined,
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
): CardTemplateSection[] {
  const defaultBlockSize = 10
  const currentSections = [...(blocks ?? [])]
  const objectiveSections = currentSections.filter(isObjectiveSection)
  const objectiveOrder = objectiveSections.length
  const lastObjectiveSection = objectiveSections[objectiveSections.length - 1]
  const inheritedConfig = lastObjectiveSection
    ? {
        choicesPerQuestion: lastObjectiveSection.choicesPerQuestion,
        optionLabels: [...lastObjectiveSection.optionLabels],
        numberingFormat: lastObjectiveSection.numberingFormat,
      }
    : {
        choicesPerQuestion: fallbackConfig.choicesPerQuestion,
        optionLabels: [...fallbackConfig.optionLabels],
        numberingFormat: fallbackConfig.numberingFormat,
      }

  if (totalQuestions <= 0 || !lastObjectiveSection) {
    return [
      ...currentSections,
      createObjectiveSection(
        currentSections.length,
        1,
        Math.min(Math.max(totalQuestions, 1), defaultBlockSize),
        inheritedConfig,
        { title: `Seção ${objectiveOrder + 1}` },
      ),
    ]
  }

  const nextStart = Math.min(MAX_QUESTIONS, lastObjectiveSection.endQuestion + 1)
  const nextEnd = Math.min(MAX_QUESTIONS, nextStart + defaultBlockSize - 1)

  return [
    ...currentSections,
    createObjectiveSection(currentSections.length, nextStart, nextEnd, inheritedConfig, {
      title: `Seção ${objectiveOrder + 1}`,
    }),
  ]
}

export function appendLabelSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createLabelSection(currentSections.length)]
}

export function appendOpenSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createOpenSection(currentSections.length)]
}

export function appendMathSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createMathSection(currentSections.length)]
}

export function appendImageSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createImageSection(currentSections.length)]
}

export function appendEssaySection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createEssaySection(currentSections.length)]
}

export function appendSpacerSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createSpacerSection(currentSections.length)]
}

export function appendPageBreakSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createPageBreakSection(currentSections.length)]
}

export function appendSignatureSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createSignatureSection(currentSections.length)]
}

export function duplicateQuestionBlockAtIndex(
  blocks: CardTemplateSection[] | undefined,
  index: number,
  totalQuestions: number,
): CardTemplateSection[] {
  const currentSections = structuredClone(blocks ?? [])
  const sourceSection = currentSections[index]
  if (!sourceSection) return currentSections

  if (isLabelSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createLabelSection(index + 1, sourceSection))
    return currentSections
  }

  if (isOpenSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createOpenSection(index + 1, sourceSection))
    return currentSections
  }

  if (isMathSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createMathSection(index + 1, sourceSection))
    return currentSections
  }

  if (isImageSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createImageSection(index + 1, sourceSection))
    return currentSections
  }

  if (isEssaySection(sourceSection)) {
    currentSections.splice(index + 1, 0, createEssaySection(index + 1, sourceSection))
    return currentSections
  }

  if (isSpacerSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createSpacerSection(index + 1, sourceSection))
    return currentSections
  }

  if (isPageBreakSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createPageBreakSection(index + 1, sourceSection))
    return currentSections
  }

  if (isSignatureSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createSignatureSection(index + 1, sourceSection))
    return currentSections
  }

  const span = Math.max(0, sourceSection.endQuestion - sourceSection.startQuestion)
  const duplicateStart = Math.min(MAX_QUESTIONS, sourceSection.endQuestion + 1)
  const duplicateEnd = Math.min(MAX_QUESTIONS, duplicateStart + span)
  const duplicateBlock: CardObjectiveSection = {
    id: createSectionId(index + 1, 'objective'),
    sectionType: 'objective',
    readMode: 'answers',
    startQuestion: duplicateStart,
    endQuestion: duplicateEnd,
    title: sourceSection.title,
    choicesPerQuestion: sourceSection.choicesPerQuestion,
    optionLabels: [...sourceSection.optionLabels],
    numberingFormat: sourceSection.numberingFormat,
  }

  currentSections.splice(index + 1, 0, duplicateBlock)
  return recalculateQuestionBlocksFromIndex(currentSections, index, Math.max(totalQuestions, duplicateEnd))
}
