import type {
  CardTemplateEditorState,
  CardTemplateValidationIssue,
  OMRReadMode,
  OMRTemplateConfig,
} from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import {
  buildNormalizedRenderModel,
  getMaxQuestionBlockChoices,
  isObjectiveSection,
  normalizeQuestionBlocks,
  validateQuestionBlocks,
} from './questionBlocks'
import { isValidOptionLabel, normalizeOptionLabels } from './optionLabels'
import { clampQuestionTotal, getResolvedTotalQuestions, MAX_QUESTIONS } from './questionLimits'
import { createTemplateLayoutConfig, getSuggestedRowsPerColumn } from './templateLayout'
import { TEMPLATE_PAGE_HEIGHT, TEMPLATE_PAGE_WIDTH } from './templateLayoutGeometry'
import { getPaginatedTemplatePages } from './templatePageLayout'

type ValidationResult = {
  sanitizedState: CardTemplateEditorState
  issues: CardTemplateValidationIssue[]
  isValid: boolean
}

const SAFE_LIMITS = {
  minRowGap: 0.04,
  minOptionGap2: 0.036,
  minOptionGap3: 0.04,
  minOptionGap4: 0.044,
  minOptionGap5: 0.048,
  minBubbleRadius: 0.01,
  maxBubbleRadius: 0.018,
  minStartX: 0.12,
  maxStartX: 0.28,
  minStartY: 0.14,
  maxStartY: 0.34,
  minColumnGap: 0.2,
  maxColumnGap: 0.42,
}

const VISUAL_LIMITS = {
  minHorizontalClearancePx: 8,
  minVerticalClearancePx: 10,
  optionLabelOffsetPx: 14,
}

function cloneState(state: CardTemplateEditorState): CardTemplateEditorState {
  return structuredClone(state)
}

function preserveEditableText(value: string | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function getSafeChoicesPerQuestion(value: number) {
  return value === 2 || value === 3 || value === 4 ? value : 5
}

function getMinOptionGap(choicesPerQuestion: 2 | 3 | 4 | 5) {
  if (choicesPerQuestion === 2) return SAFE_LIMITS.minOptionGap2
  if (choicesPerQuestion === 3) return SAFE_LIMITS.minOptionGap3
  if (choicesPerQuestion === 4) return SAFE_LIMITS.minOptionGap4
  return SAFE_LIMITS.minOptionGap5
}

function getQuestionBlockGapDetails(blocks: CardTemplateEditorState['definition']['questionBlocks']) {
  const objectiveBlocks = blocks.filter(isObjectiveSection)
  const gapDetails: Array<{ previousBlockNumber: number | null; nextBlockNumber: number; startQuestion: number; endQuestion: number }> = []
  if (!objectiveBlocks.length) return gapDetails

  if (objectiveBlocks[0].startQuestion > 1) {
    gapDetails.push({
      previousBlockNumber: null,
      nextBlockNumber: 1,
      startQuestion: 1,
      endQuestion: objectiveBlocks[0].startQuestion - 1,
    })
  }

  for (let index = 1; index < objectiveBlocks.length; index += 1) {
    const previousBlock = objectiveBlocks[index - 1]
    const currentBlock = objectiveBlocks[index]
    if (previousBlock.endQuestion + 1 < currentBlock.startQuestion) {
      gapDetails.push({
        previousBlockNumber: index,
        nextBlockNumber: index + 1,
        startQuestion: previousBlock.endQuestion + 1,
        endQuestion: currentBlock.startQuestion - 1,
      })
    }
  }

  return gapDetails
}

function getQuestionBlockOverlapDetails(blocks: CardTemplateEditorState['definition']['questionBlocks']) {
  const objectiveBlocks = blocks.filter(isObjectiveSection)
  const overlapDetails: Array<{ previousBlockNumber: number; nextBlockNumber: number; startQuestion: number; endQuestion: number }> = []

  for (let index = 1; index < objectiveBlocks.length; index += 1) {
    const previousBlock = objectiveBlocks[index - 1]
    const currentBlock = objectiveBlocks[index]
    if (previousBlock.endQuestion >= currentBlock.startQuestion) {
      overlapDetails.push({
        previousBlockNumber: index,
        nextBlockNumber: index + 1,
        startQuestion: currentBlock.startQuestion,
        endQuestion: Math.min(previousBlock.endQuestion, currentBlock.endQuestion),
      })
    }
  }

  return overlapDetails
}

export function getReadModeFromConfig(config: OMRTemplateConfig): OMRReadMode {
  if (config.markThreshold >= 0.42) return 'conservative'
  if (config.markThreshold <= 0.28) return 'sensitive'
  return 'balanced'
}

export function getConfidenceLabel(config: OMRTemplateConfig) {
  if (config.markThreshold >= 0.42 && config.ambiguityThreshold <= 0.05) return 'Alta'
  if (config.markThreshold <= 0.28 || config.ambiguityThreshold >= 0.1) return 'Moderada'
  return 'Equilibrada'
}

export function getFriendlyOmrModeValues(mode: OMRReadMode) {
  switch (mode) {
    case 'conservative':
      return { markThreshold: 0.44, ambiguityThreshold: 0.05 }
    case 'sensitive':
      return { markThreshold: 0.26, ambiguityThreshold: 0.1 }
    default:
      return { markThreshold: 0.35, ambiguityThreshold: 0.07 }
  }
}

export function normalizeEditorState(state: CardTemplateEditorState): CardTemplateEditorState {
  const nextState = cloneState(state)
  const definitionWithLegacy = nextState.definition as typeof nextState.definition & {
    numberingMode?: 'continuous' | 'by-block'
    numberingPattern?: 'row-column' | 'sequence-column'
    numberingFormat?: 'numeric' | 'numericAlpha' | 'alphaNumeric' | 'numericLower' | 'numericDash'
    columnLayoutMode?: 'left' | 'distributed'
    questionStyle?: 'classic' | 'lined' | 'minimal'
    questionBlocks?: Array<{
      questionStyle?: 'classic' | 'lined' | 'minimal'
      numberingFormat?: 'numeric' | 'numericAlpha' | 'alphaNumeric' | 'numericLower' | 'numericDash'
      sectionType?: 'objective' | 'mathematics' | 'math' | 'open' | 'label' | 'spacer' | 'pageBreak' | 'signature' | 'essay'
      lines?: number
      lineStyle?: 'line' | 'box'
      columns?: number
      showTopInputRow?: boolean
      showColumnHeaders?: boolean
      columnHeaders?: string[]
      showColumnSeparators?: boolean
      columnSeparators?: string[]
      linkedToMainQuestion?: boolean
      linkedQuestionNumber?: number | null
      markerLabel?: string
      style?: 'lines' | 'box'
      highlightStep?: number
      showHeaderFields?: boolean
      showHeader?: boolean
      showEssayTitleField?: boolean
      showStudentName?: boolean
      showClass?: boolean
      showTestName?: boolean
      showCode?: boolean
      showTeacher?: boolean
      showShift?: boolean
      showDate?: boolean
      showLogo?: boolean
      logoPosition?: 'top-left' | 'top-center' | 'top-right'
      showQRCode?: boolean
      qrPosition?: 'bottom-right' | 'top-right'
    }>
  }
  const totalQuestions = clampQuestionTotal(getResolvedTotalQuestions(nextState.definition))
  const requestedColumns = Math.max(1, Math.round(nextState.definition.columns))
  const choicesPerQuestion = getSafeChoicesPerQuestion(nextState.definition.choicesPerQuestion)
  const rowsPerColumn = Math.max(1, Math.round(nextState.definition.rowsPerColumn))

  nextState.definition.pageSize = 'A4'
  nextState.definition.totalQuestions = totalQuestions
  nextState.definition.choicesPerQuestion = choicesPerQuestion
  nextState.definition.optionLabels = normalizeOptionLabels(nextState.definition.optionLabels, choicesPerQuestion)
  const legacyQuestionStyleSection = nextState.definition.questionBlocks.find(
    (section): section is typeof section & { questionStyle?: 'classic' | 'lined' | 'minimal' } =>
      'questionStyle' in (section as object),
  )
  nextState.definition.questionStyle =
    definitionWithLegacy.questionStyle === 'lined' || definitionWithLegacy.questionStyle === 'minimal'
      ? definitionWithLegacy.questionStyle
      : legacyQuestionStyleSection?.questionStyle === 'lined' || legacyQuestionStyleSection?.questionStyle === 'minimal'
        ? legacyQuestionStyleSection.questionStyle
        : nextState.visualTheme.answerGridStyle === 'lined' || nextState.visualTheme.answerGridStyle === 'minimal'
          ? nextState.visualTheme.answerGridStyle
          : 'classic'
  nextState.definition.bubbleSize =
    nextState.definition.bubbleSize === 'medium' || nextState.definition.bubbleSize === 'small'
      ? nextState.definition.bubbleSize
      : 'large'
  const columns = Math.min(nextState.definition.bubbleSize === 'small' ? 4 : 3, requestedColumns)
  nextState.definition.columns = columns
  nextState.definition.rowSpacing = nextState.definition.rowSpacing === 'uniform' ? 'uniform' : 'compact'
  nextState.definition.columnLayoutMode =
    definitionWithLegacy.columnLayoutMode === 'distributed' ? 'distributed' : 'left'
  nextState.definition.columnGap = Math.min(40, Math.max(0, nextState.definition.columnGap ?? 8))
  nextState.definition.optionAlignment =
    nextState.definition.optionAlignment === 'left' ||
    nextState.definition.optionAlignment === 'right' ||
    nextState.definition.optionAlignment === 'center' ||
    nextState.definition.optionAlignment === 'justify'
      ? nextState.definition.optionAlignment
      : 'auto'
  nextState.definition.enableQuestionBlocks = Boolean(nextState.definition.enableQuestionBlocks)
  nextState.definition.showQuestionBlockTitles = Boolean(nextState.definition.showQuestionBlockTitles)
  const fallbackNumberingFormat = 'numeric'
  nextState.definition.questionBlocks = normalizeQuestionBlocks(nextState.definition.questionBlocks, totalQuestions, {
    choicesPerQuestion,
    optionLabels: nextState.definition.optionLabels,
    numberingFormat: fallbackNumberingFormat,
  })
  nextState.visualTheme.answerGridStyle = nextState.definition.questionStyle
  const effectiveChoicesPerQuestion = getMaxQuestionBlockChoices(nextState.definition)
  nextState.definition.rowsPerColumn = Math.max(getSuggestedRowsPerColumn(totalQuestions, columns), rowsPerColumn)
  nextState.omrConfig = createTemplateLayoutConfig(totalQuestions, {
    ...nextState.omrConfig,
    totalQuestions,
    choicesPerQuestion: effectiveChoicesPerQuestion,
    columns,
    rowsPerColumn: nextState.definition.rowsPerColumn,
  })

  nextState.definition.header.examName = preserveEditableText(
    nextState.definition.header.examName,
    preserveEditableText(nextState.name, 'Cartão-resposta'),
  )
  nextState.definition.header.institutionName = preserveEditableText(nextState.definition.header.institutionName, 'Instituição')
  nextState.definition.header.instructions =
    preserveEditableText(nextState.definition.header.instructions, 'Marque apenas uma alternativa e preencha todo o campo da bolinha')
  nextState.definition.header.showInstructions = Boolean(nextState.definition.header.showInstructions)
  nextState.definition.header.footerMessage = preserveEditableText(nextState.definition.header.footerMessage, '')
  nextState.definition.header.footerMessageAlignment =
    nextState.definition.header.footerMessageAlignment === 'left' || nextState.definition.header.footerMessageAlignment === 'right'
      ? nextState.definition.header.footerMessageAlignment
      : 'center'
  nextState.definition.header.footerMessageWeight =
    nextState.definition.header.footerMessageWeight === 'semibold' ? 'semibold' : 'regular'
  nextState.definition.header.footerMessageFontSize = Math.min(11, Math.max(7, nextState.definition.header.footerMessageFontSize ?? 7.5))
  nextState.definition.header.footerPagePosition =
    nextState.definition.header.footerPagePosition === 'top' ? 'top' : 'bottom'
  nextState.definition.header.footerPageTone =
    nextState.definition.header.footerPageTone === 'standard' ? 'standard' : 'subtle'
  nextState.definition.header.institutionLogoDataUrl = nextState.definition.header.institutionLogoDataUrl?.trim() ?? ''
  nextState.definition.header.logoAlignment =
    nextState.definition.header.logoAlignment === 'left' || nextState.definition.header.logoAlignment === 'right'
      ? nextState.definition.header.logoAlignment
      : 'center'
  nextState.definition.header.logoScale = Math.min(1.2, Math.max(0.6, nextState.definition.header.logoScale ?? 1))
  nextState.definition.header.logoMonochrome = Boolean(nextState.definition.header.logoMonochrome)
  nextState.name = preserveEditableText(nextState.name, nextState.definition.header.examName)

  const safeZones = getCardTemplateZones(nextState)
  let currentMetrics = safeZones.metrics
  let safeWidth = safeZones.answers.right - safeZones.answers.left
  let minStartX = safeZones.answers.left / TEMPLATE_PAGE_WIDTH
  let maxStartX =
    (safeZones.answers.right -
      (nextState.definition.columns - 1) * currentMetrics.columnOffset -
      currentMetrics.rowWidth) /
    TEMPLATE_PAGE_WIDTH

  const maxOptionGapRatio =
    nextState.definition.choicesPerQuestion > 1
      ? Math.max(
          nextState.omrConfig.optionGapRatio,
          Math.min(
            SAFE_LIMITS.maxColumnGap,
            (safeWidth / TEMPLATE_PAGE_WIDTH) /
              ((nextState.definition.columns - 1) * Math.max(nextState.omrConfig.columnGapRatio, 0.001) * TEMPLATE_PAGE_WIDTH / TEMPLATE_PAGE_WIDTH +
                nextState.definition.choicesPerQuestion + 1),
          ),
        )
      : nextState.omrConfig.optionGapRatio

  nextState.omrConfig.optionGapRatio = Math.max(
    getMinOptionGap(nextState.definition.choicesPerQuestion),
    Math.min(nextState.omrConfig.optionGapRatio, maxOptionGapRatio),
  )

  nextState.omrConfig.bubbleRadiusRatio = Math.min(
    SAFE_LIMITS.maxBubbleRadius,
    Math.max(SAFE_LIMITS.minBubbleRadius, nextState.omrConfig.bubbleRadiusRatio),
  )

  currentMetrics = getCardTemplateZones(nextState).metrics
  const refreshedZones = getCardTemplateZones(nextState)
  const maxColumnGapRatio =
    nextState.definition.columns > 1
      ? Math.max(
          SAFE_LIMITS.minColumnGap,
          Math.min(
            SAFE_LIMITS.maxColumnGap,
            (refreshedZones.answers.right -
              (refreshedZones.answers.left + currentMetrics.rowWidth)) /
              (TEMPLATE_PAGE_WIDTH * (nextState.definition.columns - 1)),
          ),
        )
      : SAFE_LIMITS.maxColumnGap

  nextState.omrConfig.columnGapRatio = Math.min(
    maxColumnGapRatio,
    Math.max(SAFE_LIMITS.minColumnGap, nextState.omrConfig.columnGapRatio),
  )

  currentMetrics = getCardTemplateZones(nextState).metrics
  const clampedZones = getCardTemplateZones(nextState)
  minStartX = clampedZones.answers.left / TEMPLATE_PAGE_WIDTH
  maxStartX =
    (clampedZones.answers.right -
      (nextState.definition.columns - 1) * currentMetrics.columnOffset -
      currentMetrics.rowWidth) /
    TEMPLATE_PAGE_WIDTH
  nextState.omrConfig.startXRatio = Math.min(
    Math.max(minStartX, SAFE_LIMITS.minStartX),
    Math.max(minStartX, Math.min(maxStartX, nextState.omrConfig.startXRatio)),
  )

  currentMetrics = getCardTemplateZones(nextState).metrics
  const verticalZones = getCardTemplateZones(nextState)
  const minStartY = Math.max(SAFE_LIMITS.minStartY, verticalZones.answers.top / TEMPLATE_PAGE_HEIGHT)
  const maxStartY =
    (verticalZones.answers.bottom -
      currentMetrics.bubbleRadius -
      VISUAL_LIMITS.optionLabelOffsetPx) /
    TEMPLATE_PAGE_HEIGHT
  nextState.omrConfig.startYRatio = Math.min(
    Math.max(minStartY, SAFE_LIMITS.minStartY),
    Math.max(minStartY, Math.min(maxStartY, nextState.omrConfig.startYRatio)),
  )

  nextState.omrConfig.rowGapRatio = Math.min(0.08, Math.max(SAFE_LIMITS.minRowGap, nextState.omrConfig.rowGapRatio))

  return nextState
}

export function validateCardTemplateEditorState(state: CardTemplateEditorState): ValidationResult {
  const sanitizedState = normalizeEditorState(state)
  const issues: CardTemplateValidationIssue[] = []
  const { definition, omrConfig, visualTheme } = sanitizedState
  const renderModel = buildNormalizedRenderModel(definition)
  const renderedQuestionTotal = renderModel.totalRenderedQuestions
  const capacity = definition.columns * definition.rowsPerColumn
  const effectiveChoicesPerQuestion = getMaxQuestionBlockChoices(definition)
  const minOptionGap = getMinOptionGap(effectiveChoicesPerQuestion)
  const zones = getCardTemplateZones(sanitizedState)
  const metrics = zones.metrics
  const pages = getPaginatedTemplatePages(sanitizedState)
  const questionBlockIssues = validateQuestionBlocks(definition.questionBlocks, definition.totalQuestions, {
    choicesPerQuestion: definition.choicesPerQuestion,
    optionLabels: definition.optionLabels,
    numberingFormat:
      definition.questionBlocks.find(isObjectiveSection)?.numberingFormat ?? 'numeric',
  })
  const invalidOptionLabels = definition.optionLabels.filter((label) => !isValidOptionLabel(label))
  const duplicatedOptionLabels = new Set(
    definition.optionLabels.filter((label, index) => definition.optionLabels.indexOf(label) !== index),
  )
  const gridLeft = metrics.questions.length
    ? Math.min(...metrics.questions.map((question) => question.rowStartX))
    : metrics.columnRowStartXs[0] ?? metrics.questionStartX - metrics.questionLabelOffset - metrics.questionLabelWidth
  const gridRight = metrics.questions.length
    ? Math.max(...metrics.questions.map((question) => question.optionStartX + question.optionGroupWidth + metrics.bubbleRadius))
    : (metrics.columnRowStartXs[definition.columns - 1] ?? metrics.questionStartX + (definition.columns - 1) * metrics.columnOffset) +
        metrics.rowWidth
  const gridTop = metrics.headerY - 12
  const gridBottom = metrics.questions.length
    ? Math.max(...metrics.questions.map((question) => question.optionY)) + metrics.bubbleRadius + VISUAL_LIMITS.optionLabelOffsetPx
    : metrics.questionStartY + metrics.bubbleRadius + VISUAL_LIMITS.optionLabelOffsetPx
  const horizontalClearance = metrics.bubbleSpacing - metrics.bubbleRadius * 2
  const verticalClearance = metrics.rowOffset - metrics.bubbleRadius * 2
  const identificationWeight =
    Number(definition.identification.showStudentName) +
    Number(definition.identification.showStudentCode) +
    Number(definition.identification.showClassroom) +
    Number(definition.identification.showDate) +
    Number(definition.identification.showExamCode) +
    Number(definition.identification.showSignature) +
    Number(definition.identification.showManualIdGrid)
  const headerLoad =
    (definition.header.instructions.trim() ? 1 : 0) +
    (definition.header.omrGuidance.trim() ? 1 : 0) +
    (definition.header.subtitle.trim() ? 1 : 0) +
    identificationWeight * 0.25
  const estimatedHeaderBottom = omrConfig.startYRatio - headerLoad * 0.01
  const qrQuietZonePadding = 12
  const footerSegmentsAreOrdered =
    zones.footer.logoX + zones.footer.logoWidth <= zones.footer.centerX &&
    zones.footer.centerX + zones.footer.centerWidth <= zones.footer.rightX
  const qrFitsSafely =
    zones.footer.codeBoxX - qrQuietZonePadding >= zones.footer.rightX &&
    zones.footer.codeBoxX + zones.footer.codeBoxWidth + qrQuietZonePadding <= zones.footer.right
  const allPagesFitAnswerZone = pages.every(({ metrics: pageMetrics }) => {
    if (!pageMetrics.questions.length) return true
    const pageGridBottom =
      Math.max(...pageMetrics.questions.map((question) => question.optionY)) +
      pageMetrics.bubbleRadius +
      VISUAL_LIMITS.optionLabelOffsetPx

    return pageGridBottom <= zones.answers.bottom
  })

  if (capacity < renderedQuestionTotal) {
    issues.push({
      severity: 'error',
      code: 'INSUFFICIENT_CAPACITY',
      field: 'definition.rowsPerColumn',
      message: 'A grade atual não comporta todas as questões da prova.',
    })
  }

  if (omrConfig.rowGapRatio < SAFE_LIMITS.minRowGap) {
    issues.push({
      severity: 'error',
      code: 'ROW_GAP_UNSAFE',
      field: 'omrConfig.rowGapRatio',
      message: 'O espaçamento entre linhas está abaixo do mínimo seguro para leitura OMR.',
    })
  }

  if (omrConfig.optionGapRatio < minOptionGap) {
    issues.push({
      severity: 'error',
      code: 'OPTION_GAP_UNSAFE',
      field: 'omrConfig.optionGapRatio',
      message: 'O espaçamento entre alternativas está abaixo do mínimo seguro.',
    })
  }

  if (omrConfig.bubbleRadiusRatio < SAFE_LIMITS.minBubbleRadius || omrConfig.bubbleRadiusRatio > SAFE_LIMITS.maxBubbleRadius) {
    issues.push({
      severity: 'error',
      code: 'BUBBLE_RADIUS_UNSAFE',
      field: 'omrConfig.bubbleRadiusRatio',
      message: 'O tamanho das bolhas saiu do intervalo confiável para impressão e leitura.',
    })
  }

  if (omrConfig.startXRatio < SAFE_LIMITS.minStartX || omrConfig.startXRatio > SAFE_LIMITS.maxStartX) {
    issues.push({
      severity: 'error',
      code: 'START_X_UNSAFE',
      field: 'omrConfig.startXRatio',
      message: 'A grade de respostas ficou fora da faixa segura horizontal da página.',
    })
  }

  if (omrConfig.startYRatio < SAFE_LIMITS.minStartY || omrConfig.startYRatio > SAFE_LIMITS.maxStartY) {
    issues.push({
      severity: 'error',
      code: 'START_Y_UNSAFE',
      field: 'omrConfig.startYRatio',
      message: 'A grade de respostas ficou fora da faixa segura vertical da página.',
    })
  }

  if (omrConfig.columnGapRatio < SAFE_LIMITS.minColumnGap || omrConfig.columnGapRatio > SAFE_LIMITS.maxColumnGap) {
    issues.push({
      severity: 'error',
      code: 'COLUMN_GAP_UNSAFE',
      field: 'omrConfig.columnGapRatio',
      message: 'A distância entre colunas saiu da janela segura para leitura.',
    })
  }

  if (estimatedHeaderBottom < 0.1) {
    issues.push({
      severity: 'error',
      code: 'HEADER_OVERLAP',
      field: 'definition.header.instructions',
      message: 'Cabeçalho e identificação invadem a área reservada para a grade OMR.',
    })
  }

  if (gridLeft < zones.answers.left || gridRight > zones.answers.right) {
    issues.push({
      severity: 'error',
      code: 'GRID_OUTSIDE_A4_WIDTH',
      field: 'definition.columns',
      message: 'A grade de respostas ultrapassou a largura segura da folha A4.',
    })
  }

  if (gridTop < zones.answers.top) {
    issues.push({
      severity: 'error',
      code: 'GRID_HITS_HEADER_ZONE',
      field: 'omrConfig.startYRatio',
      message: 'A grade de respostas subiu demais e invadiu o cabeçalho ou as instruções.',
    })
  }

  if (gridBottom > zones.answers.bottom) {
    issues.push({
      severity: 'error',
      code: 'GRID_HITS_FOOTER_ZONE',
      field: 'omrConfig.rowGapRatio',
      message: 'A grade de respostas desceu demais e invadiu o rodapé técnico da folha.',
    })
  }

  if (definition.optionLabels.length !== definition.choicesPerQuestion) {
    issues.push({
      severity: 'error',
      code: 'OPTION_LABEL_COUNT_MISMATCH',
      field: 'definition.optionLabels',
      message: 'A quantidade de caracteres das alternativas deve ser igual à quantidade de alternativas por questão.',
    })
  }

  if (invalidOptionLabels.length) {
    issues.push({
      severity: 'error',
      code: 'OPTION_LABEL_INVALID',
      field: 'definition.optionLabels',
      message: 'Use apenas letras de A a Z ou números de 0 a 9 nas alternativas.',
    })
  }

  if (duplicatedOptionLabels.size > 0) {
    issues.push({
      severity: 'error',
      code: 'OPTION_LABEL_DUPLICATE',
      field: 'definition.optionLabels',
      message: 'Os caracteres das alternativas não podem se repetir na mesma questão.',
    })
  }

  if (definition.totalQuestions > MAX_QUESTIONS) {
    issues.push({
      severity: 'error',
      code: 'TOTAL_QUESTIONS_LIMIT',
      field: 'definition.totalQuestions',
      message: `O cartão suporta no máximo ${MAX_QUESTIONS} questões.`,
    })
  }

  if (!allPagesFitAnswerZone) {
    issues.push({
      severity: 'error',
      code: 'PAGE_LAYOUT_OVERFLOWS',
      field: 'definition.totalQuestions',
      message: 'A paginação técnica não fechou corretamente e uma das páginas invade a área inferior segura.',
    })
  }

  if (horizontalClearance < VISUAL_LIMITS.minHorizontalClearancePx) {
    issues.push({
      severity: 'error',
      code: 'BUBBLES_OVERLAP_HORIZONTAL',
      field: 'omrConfig.optionGapRatio',
      message: 'As bolhas ficaram próximas demais horizontalmente e comprometem a leitura OMR.',
    })
  }

  if (verticalClearance < VISUAL_LIMITS.minVerticalClearancePx) {
    issues.push({
      severity: 'error',
      code: 'BUBBLES_OVERLAP_VERTICAL',
      field: 'omrConfig.rowGapRatio',
      message: 'As linhas da grade ficaram comprimidas demais e podem colidir visualmente.',
    })
  }

  if (!footerSegmentsAreOrdered) {
    issues.push({
      severity: 'error',
      code: 'FOOTER_SEGMENTS_COLLIDE',
      field: 'definition.header.footerMessage',
      message: 'As zonas do rodapé técnico se sobrepõem e precisam ser reorganizadas.',
    })
  }

  if (!qrFitsSafely) {
    issues.push({
      severity: 'error',
      code: 'QR_ZONE_UNSAFE',
      field: 'definition.identification.showExamCode',
      message: 'A área do QR code perdeu a folga mínima de respiro dentro do rodapé técnico.',
    })
  }

  ;(
    [
      ['startXRatio', 'O deslocamento horizontal foi limitado para manter a grade dentro da área segura.'],
      ['startYRatio', 'O deslocamento vertical foi limitado para proteger cabeçalho e rodapé.'],
      ['columnGapRatio', 'O espaçamento entre colunas foi limitado para não sair da folha.'],
      ['rowGapRatio', 'O espaçamento entre linhas foi limitado para não invadir o rodapé.'],
      ['optionGapRatio', 'O espaçamento entre alternativas foi limitado para não estourar a largura da grade.'],
      ['bubbleRadiusRatio', 'O tamanho das bolhas foi limitado para manter a grade dentro da zona segura.'],
    ] as const
  ).forEach(([field, message]) => {
    if (state.omrConfig[field] !== sanitizedState.omrConfig[field]) {
      issues.push({
        severity: 'warning',
        code: `AUTO_CLAMP_${field.toUpperCase()}`,
        field: `omrConfig.${field}`,
        message,
      })
    }
  })

  if (definition.identification.showManualIdGrid && definition.identification.extraFields.length > 2) {
    issues.push({
      severity: 'warning',
      code: 'IDENTIFICATION_DENSE',
      field: 'definition.identification.extraFields',
      message: 'A identificação está ficando densa e pode competir visualmente com a grade de respostas.',
    })
  }

  if (definition.rowsPerColumn > 24 || (renderedQuestionTotal >= 60 && visualTheme.density === 'compact')) {
    issues.push({
      severity: 'warning',
      code: 'DENSITY_RISK',
      field: 'definition.rowsPerColumn',
      message: 'A densidade visual está alta. Revise o espaçamento antes de imprimir em grande escala.',
    })
  }

  questionBlockIssues.forEach((issue) => {
    const isLinkWarning = issue.code.startsWith('QUESTION_LINK_MISSING_') || issue.code.startsWith('QUESTION_LINK_CONFLICT_')
    issues.push({
      severity: issue.code === 'QUESTION_BLOCKS_WITH_GAPS' || isLinkWarning ? 'warning' : 'error',
      code: issue.code,
      field: 'definition.questionBlocks',
      message: issue.message,
    })
  })

  if (definition.enableQuestionBlocks) {
    issues.push({
      severity: 'info',
      code: 'QUESTION_BLOCK_RENDER_LIMIT',
      field: 'definition.questionBlocks',
      message: `O último bloco configurado termina na questão ${renderModel.lastRenderedQuestion || 0}. O preview e o PDF renderizam ${renderedQuestionTotal} questões efetivas.`,
    })

    if (renderModel.hasGaps) {
      const gapSummary = renderModel.gapRanges
        .map((range) => (range.startQuestion === range.endQuestion ? `${range.startQuestion}` : `${range.startQuestion}-${range.endQuestion}`))
        .join(', ')
      issues.push({
        severity: 'warning',
        code: 'QUESTION_BLOCK_RENDER_GAPS',
        field: 'definition.questionBlocks',
        message: `Há lacunas entre os blocos: ${gapSummary}. Essas questões não entram no preview nem no PDF.`,
      })
    }

    if (renderModel.hasOverlap) {
      issues.push({
        severity: 'warning',
        code: 'QUESTION_BLOCK_RENDER_OVERLAP',
        field: 'definition.questionBlocks',
        message: `Há sobreposição entre blocos nas questões ${renderModel.overlappingQuestions.join(', ')}. O renderer mantém apenas a primeira ocorrência de cada questão.`,
      })
    }

    if (renderModel.outOfRangeQuestions.length) {
      issues.push({
        severity: 'warning',
        code: 'QUESTION_BLOCK_RENDER_OUT_OF_RANGE',
        field: 'definition.questionBlocks',
        message: `Questões acima do limite do sistema foram ignoradas: ${renderModel.outOfRangeQuestions.join(', ')}.`,
      })
    }
  }

  if (definition.enableQuestionBlocks) {
    const gapDetails = getQuestionBlockGapDetails(definition.questionBlocks)
    const overlapDetails = getQuestionBlockOverlapDetails(definition.questionBlocks)

    gapDetails.forEach((gap, detailIndex) => {
      const gapRange =
        gap.startQuestion === gap.endQuestion ? `${gap.startQuestion}` : `${gap.startQuestion}-${gap.endQuestion}`
      const relationLabel =
        gap.previousBlockNumber === null
          ? `antes do bloco ${gap.nextBlockNumber}`
          : `entre os blocos ${gap.previousBlockNumber} e ${gap.nextBlockNumber}`

      issues.push({
        severity: 'warning',
        code: `QUESTION_BLOCK_RENDER_GAP_DETAIL_${detailIndex}`,
        field: 'definition.questionBlocks',
        message: `Há lacuna ${relationLabel}: questões ${gapRange}. Essas questões não entram no preview nem no PDF.`,
      })
    })

    overlapDetails.forEach((overlap, detailIndex) => {
      const overlapRange =
        overlap.startQuestion === overlap.endQuestion
          ? `${overlap.startQuestion}`
          : `${overlap.startQuestion}-${overlap.endQuestion}`

      issues.push({
        severity: 'warning',
        code: `QUESTION_BLOCK_RENDER_OVERLAP_DETAIL_${detailIndex}`,
        field: 'definition.questionBlocks',
        message: `Existe sobreposição entre os blocos ${overlap.previousBlockNumber} e ${overlap.nextBlockNumber} nas questões ${overlapRange}. O renderer mantém apenas a primeira ocorrência de cada questão.`,
      })
    })
  }

  if (getReadModeFromConfig(omrConfig) === 'sensitive') {
    issues.push({
      severity: 'warning',
      code: 'SENSITIVE_OMR',
      field: 'omrConfig.markThreshold',
      message: 'O modo de leitura está sensível. Isso facilita captar marcas leves, mas aumenta o risco de ambiguidades.',
    })
  }

  issues.push({
    severity: 'info',
    code: 'EXPECTED_CONFIDENCE',
    field: 'omrConfig.markThreshold',
    message: `Nivel de confianca esperado: ${getConfidenceLabel(omrConfig)}.`,
  })

  issues.push({
    severity: 'info',
    code: 'LAYOUT_BLUEPRINT_READY',
    field: 'definition.pageSize',
    message: `Blueprint técnico pronto: ${pages.length} página(s), ${pages[0]?.rowsPerPage ?? 0} linhas úteis por página e QR em zona fixa.`,
  })

  return {
    sanitizedState,
    issues,
    isValid: !issues.some((issue) => issue.severity === 'error'),
  }
}






