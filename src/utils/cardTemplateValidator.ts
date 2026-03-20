import type {
  CardTemplateEditorState,
  CardTemplateValidationIssue,
  OMRReadMode,
  OMRTemplateConfig,
} from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { createTemplateLayoutConfig, getSuggestedRowsPerColumn } from './templateLayout'
import { TEMPLATE_PAGE_HEIGHT, TEMPLATE_PAGE_WIDTH } from './templateLayoutGeometry'

type ValidationResult = {
  sanitizedState: CardTemplateEditorState
  issues: CardTemplateValidationIssue[]
  isValid: boolean
}

const SAFE_LIMITS = {
  minRowGap: 0.04,
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
  const totalQuestions = Math.max(1, Math.round(nextState.definition.totalQuestions))
  const columns = Math.min(4, Math.max(1, Math.round(nextState.definition.columns)))
  const choicesPerQuestion = nextState.definition.choicesPerQuestion === 4 ? 4 : 5
  const rowsPerColumn = Math.max(1, Math.round(nextState.definition.rowsPerColumn))

  nextState.definition.pageSize = 'A4'
  nextState.definition.totalQuestions = totalQuestions
  nextState.definition.columns = columns
  nextState.definition.choicesPerQuestion = choicesPerQuestion
  nextState.definition.rowsPerColumn = Math.max(getSuggestedRowsPerColumn(totalQuestions, columns), rowsPerColumn)
  nextState.omrConfig = createTemplateLayoutConfig(totalQuestions, {
    ...nextState.omrConfig,
    totalQuestions,
    choicesPerQuestion,
    columns,
    rowsPerColumn: nextState.definition.rowsPerColumn,
  })

  nextState.definition.header.examName = nextState.definition.header.examName.trim() || nextState.name.trim() || 'Cartão-resposta'
  nextState.definition.header.institutionName = nextState.definition.header.institutionName.trim() || 'Instituição'
  nextState.name = nextState.name.trim() || nextState.definition.header.examName

  const safeZones = getCardTemplateZones(nextState)
  let currentMetrics = safeZones.metrics
  let safeWidth = safeZones.answers.right - safeZones.answers.left
  let minStartX = (safeZones.answers.left + currentMetrics.questionLabelOffset + currentMetrics.questionLabelWidth) / TEMPLATE_PAGE_WIDTH
  let maxStartX =
    (safeZones.answers.right -
      (nextState.definition.columns - 1) * currentMetrics.columnOffset -
      currentMetrics.answerBlockWidth -
      currentMetrics.bubbleRadius) /
    TEMPLATE_PAGE_WIDTH

  while (nextState.definition.columns > 1 && maxStartX < minStartX) {
    nextState.definition.columns -= 1
    nextState.definition.rowsPerColumn = Math.max(
      nextState.definition.rowsPerColumn,
      getSuggestedRowsPerColumn(nextState.definition.totalQuestions, nextState.definition.columns),
    )
    nextState.omrConfig = createTemplateLayoutConfig(nextState.definition.totalQuestions, {
      ...nextState.omrConfig,
      totalQuestions: nextState.definition.totalQuestions,
      choicesPerQuestion: nextState.definition.choicesPerQuestion,
      columns: nextState.definition.columns,
      rowsPerColumn: nextState.definition.rowsPerColumn,
    })
    currentMetrics = getCardTemplateZones(nextState).metrics
    safeWidth = getCardTemplateZones(nextState).answers.right - getCardTemplateZones(nextState).answers.left
    minStartX = (getCardTemplateZones(nextState).answers.left + currentMetrics.questionLabelOffset + currentMetrics.questionLabelWidth) / TEMPLATE_PAGE_WIDTH
    maxStartX =
      (getCardTemplateZones(nextState).answers.right -
        (nextState.definition.columns - 1) * currentMetrics.columnOffset -
        currentMetrics.answerBlockWidth -
        currentMetrics.bubbleRadius) /
      TEMPLATE_PAGE_WIDTH
  }

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
    nextState.definition.choicesPerQuestion === 4 ? SAFE_LIMITS.minOptionGap4 : SAFE_LIMITS.minOptionGap5,
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
              (refreshedZones.answers.left +
                currentMetrics.questionLabelOffset +
                currentMetrics.questionLabelWidth +
                currentMetrics.answerBlockWidth +
                currentMetrics.bubbleRadius)) /
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
  minStartX = (clampedZones.answers.left + currentMetrics.questionLabelOffset + currentMetrics.questionLabelWidth) / TEMPLATE_PAGE_WIDTH
  maxStartX =
    (clampedZones.answers.right -
      (nextState.definition.columns - 1) * currentMetrics.columnOffset -
      currentMetrics.answerBlockWidth -
      currentMetrics.bubbleRadius) /
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
      (nextState.definition.rowsPerColumn - 1) * currentMetrics.rowOffset -
      currentMetrics.bubbleRadius -
      VISUAL_LIMITS.optionLabelOffsetPx) /
    TEMPLATE_PAGE_HEIGHT
  nextState.omrConfig.startYRatio = Math.min(
    Math.max(minStartY, SAFE_LIMITS.minStartY),
    Math.max(minStartY, Math.min(maxStartY, nextState.omrConfig.startYRatio)),
  )

  currentMetrics = getCardTemplateZones(nextState).metrics
  const maxRowGapRatio =
    nextState.definition.rowsPerColumn > 1
      ? (verticalZones.answers.bottom -
          currentMetrics.questionStartY -
          currentMetrics.bubbleRadius -
          VISUAL_LIMITS.optionLabelOffsetPx) /
        (TEMPLATE_PAGE_HEIGHT * (nextState.definition.rowsPerColumn - 1))
      : SAFE_LIMITS.maxColumnGap
  nextState.omrConfig.rowGapRatio = Math.min(
    Math.max(SAFE_LIMITS.minRowGap, maxRowGapRatio),
    Math.max(SAFE_LIMITS.minRowGap, nextState.omrConfig.rowGapRatio),
  )

  return nextState
}

export function validateCardTemplateEditorState(state: CardTemplateEditorState): ValidationResult {
  const sanitizedState = normalizeEditorState(state)
  const issues: CardTemplateValidationIssue[] = []
  const { definition, omrConfig, visualTheme } = sanitizedState
  const capacity = definition.columns * definition.rowsPerColumn
  const minOptionGap = definition.choicesPerQuestion === 4 ? SAFE_LIMITS.minOptionGap4 : SAFE_LIMITS.minOptionGap5
  const zones = getCardTemplateZones(sanitizedState)
  const metrics = zones.metrics
  const gridLeft = metrics.questionStartX - metrics.questionLabelOffset - metrics.questionLabelWidth
  const gridRight =
    metrics.questionStartX + (definition.columns - 1) * metrics.columnOffset + metrics.answerBlockWidth + metrics.bubbleRadius
  const gridTop = metrics.headerY - 12
  const gridBottom = metrics.questionStartY + (definition.rowsPerColumn - 1) * metrics.rowOffset + metrics.bubbleRadius + VISUAL_LIMITS.optionLabelOffsetPx
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

  if (capacity < definition.totalQuestions) {
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

  if (definition.columns >= 4 && definition.choicesPerQuestion === 5) {
    issues.push({
      severity: 'error',
      code: 'COLUMN_WIDTH_OVERFLOW',
      field: 'definition.columns',
      message: 'Quatro colunas com cinco alternativas deixam a área útil apertada demais em A4.',
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

  if (state.definition.columns !== sanitizedState.definition.columns) {
    issues.push({
      severity: 'warning',
      code: 'COLUMNS_LIMITED_TO_A4',
      field: 'definition.columns',
      message: 'A quantidade de colunas foi reduzida para manter a grade dentro da folha A4.',
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

  if (definition.rowsPerColumn > 24 || (definition.totalQuestions >= 60 && visualTheme.density === 'compact')) {
    issues.push({
      severity: 'warning',
      code: 'DENSITY_RISK',
      field: 'definition.rowsPerColumn',
      message: 'A densidade visual está alta. Revise o espaçamento antes de imprimir em grande escala.',
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

  return {
    sanitizedState,
    issues,
    isValid: !issues.some((issue) => issue.severity === 'error'),
  }
}
