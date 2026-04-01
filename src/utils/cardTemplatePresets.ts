import type {
  CardPresetId,
  CardTemplateDefinition,
  CardTemplateEditorState,
  CardVisualTheme,
  OMRTemplateConfig,
  Template,
} from '../types/omr'
import { createTemplateLayoutConfig, getSuggestedRowsPerColumn } from './templateLayout'
import { normalizeOptionLabels } from './optionLabels'
import { clampQuestionTotal, getResolvedTotalQuestions } from './questionLimits'
import { getMaxQuestionBlockChoices, normalizeQuestionBlocks } from './questionBlocks'

type CardPreset = {
  id: CardPresetId
  label: string
  description: string
  definition: CardTemplateDefinition
  visualTheme: CardVisualTheme
  omrConfig: OMRTemplateConfig
}

const defaultTheme: CardVisualTheme = {
  visualStyle: 'institutional',
  density: 'balanced',
  softBorders: true,
  showSectionSeparators: true,
  refinedAlignment: true,
  highlightHeader: true,
  answerGridStyle: 'classic',
}

function createDefinition(input: Partial<CardTemplateDefinition> = {}): CardTemplateDefinition {
  const totalQuestions = clampQuestionTotal(input.totalQuestions ?? 45)
  const columns = input.columns ?? 2
  const choicesPerQuestion = input.choicesPerQuestion ?? 5
  const questionStyle = input.questionBlocks?.[0]?.questionStyle ?? 'classic'

  return {
    pageSize: 'A4',
    totalQuestions,
    choicesPerQuestion,
    optionLabels: normalizeOptionLabels(input.optionLabels, choicesPerQuestion),
    columns,
    rowsPerColumn: input.rowsPerColumn ?? getSuggestedRowsPerColumn(totalQuestions, columns),
    numberingFormat: input.numberingFormat ?? 'numeric',
    bubbleSize: input.bubbleSize ?? 'large',
    rowSpacing: input.rowSpacing ?? 'compact',
    columnLayoutMode: input.columnLayoutMode ?? 'left',
    columnGap: input.columnGap ?? 8,
    optionAlignment: input.optionAlignment ?? 'auto',
    enableQuestionBlocks: input.enableQuestionBlocks ?? false,
    showQuestionBlockTitles: input.showQuestionBlockTitles ?? true,
    questionBlocks: normalizeQuestionBlocks(input.questionBlocks ?? [], totalQuestions, {
      choicesPerQuestion,
      optionLabels: normalizeOptionLabels(input.optionLabels, choicesPerQuestion),
      questionStyle,
    }),
    identification: {
      showStudentName: input.identification?.showStudentName ?? true,
      showStudentCode: input.identification?.showStudentCode ?? true,
      showClassroom: input.identification?.showClassroom ?? true,
      showDate: input.identification?.showDate ?? false,
      showExamCode: input.identification?.showExamCode ?? true,
      showSignature: input.identification?.showSignature ?? false,
      showManualIdGrid: input.identification?.showManualIdGrid ?? false,
      extraFields: input.identification?.extraFields ?? [],
    },
    header: {
      institutionName: input.header?.institutionName ?? 'Instituição',
      examName: input.header?.examName ?? 'Cartão-resposta',
      subtitle: input.header?.subtitle ?? 'Preencha com caneta preta ou azul.',
      classroomLabel: input.header?.classroomLabel ?? 'Turma',
      instructions:
        input.header?.instructions ?? 'Marque apenas uma alternativa e preencha todo o campo da bolinha',
      showInstructions: input.header?.showInstructions ?? true,
      omrGuidance:
        input.header?.omrGuidance ?? 'Evite rasuras, marcas leves e dobras na área de respostas.',
      footerMessage: input.header?.footerMessage ?? '',
      footerMessageAlignment: input.header?.footerMessageAlignment ?? 'center',
      footerMessageWeight: input.header?.footerMessageWeight ?? 'regular',
      footerMessageFontSize: input.header?.footerMessageFontSize ?? 7.5,
      footerPagePosition: input.header?.footerPagePosition ?? 'bottom',
      footerPageTone: input.header?.footerPageTone ?? 'subtle',
      showInstitutionLogo: input.header?.showInstitutionLogo ?? false,
      institutionLogoDataUrl: input.header?.institutionLogoDataUrl ?? '',
      logoAlignment: input.header?.logoAlignment ?? 'center',
      logoScale: input.header?.logoScale ?? 1,
      logoMonochrome: input.header?.logoMonochrome ?? false,
    },
  }
}

function createPreset(
  id: CardPresetId,
  label: string,
  description: string,
  definitionOverrides: Partial<CardTemplateDefinition>,
  omrOverrides: Partial<OMRTemplateConfig>,
  themeOverrides: Partial<CardVisualTheme> = {},
): CardPreset {
  const definition = createDefinition(definitionOverrides)
  const omrConfig = createTemplateLayoutConfig(definition.totalQuestions, {
    choicesPerQuestion: definition.choicesPerQuestion,
    columns: definition.columns,
    rowsPerColumn: definition.rowsPerColumn,
    ...omrOverrides,
  })

  return {
    id,
    label,
    description,
    definition,
    visualTheme: {
      ...defaultTheme,
      ...themeOverrides,
    },
    omrConfig,
  }
}

function getMaxSafeColumns(_choicesPerQuestion: 2 | 3 | 4 | 5, bubbleSize: CardTemplateDefinition['bubbleSize']) {
  if (bubbleSize === 'small') return 4
  return 3
}

function getPreferredColumns(totalQuestions: number, choicesPerQuestion: 2 | 3 | 4 | 5, presetId: CardPresetId) {
  if (presetId === 'quiz-20') return 2
  if (presetId === 'quiz-60') return 3

  if (choicesPerQuestion <= 4) {
    if (totalQuestions <= 24) return 2
    if (totalQuestions <= 60) return 3
    return 3
  }

  if (totalQuestions <= 45) return 2
  if (totalQuestions <= 75) return 3
  return 3
}

function getDensityAdjustedRowGap(baseRowGap: number, density: CardVisualTheme['density']) {
  if (density === 'compact') return Math.max(0.05, baseRowGap - 0.004)
  if (density === 'spacious') return Math.min(0.08, baseRowGap + 0.004)
  return baseRowGap
}

export const cardTemplatePresets: CardPreset[] = [
  createPreset(
    'enem-a4',
    'ENEM A4',
    'Modelo equilibrado para provas longas com 45 questões e 5 alternativas.',
    {
      totalQuestions: 45,
      choicesPerQuestion: 5,
      columns: 2,
      rowsPerColumn: 23,
      identification: {
        showStudentName: true,
        showStudentCode: true,
        showClassroom: true,
        showDate: false,
        showExamCode: true,
        showSignature: false,
        showManualIdGrid: false,
        extraFields: [],
      },
      header: {
        institutionName: 'Instituição',
        examName: 'Simulado ENEM',
        subtitle: 'Cartão-resposta oficial',
        classroomLabel: 'Turma',
        instructions: 'Marque apenas uma alternativa e preencha todo o campo da bolinha',
        showInstructions: true,
        omrGuidance: 'Use caneta escura e evite dobras na folha.',
        footerMessage: '',
        footerMessageAlignment: 'center',
        footerMessageWeight: 'regular',
        footerMessageFontSize: 7.5,
        footerPagePosition: 'bottom',
        footerPageTone: 'subtle',
        showInstitutionLogo: false,
        institutionLogoDataUrl: '',
        logoAlignment: 'center',
        logoScale: 1,
        logoMonochrome: false,
      },
    },
    {
      totalQuestions: 45,
      choicesPerQuestion: 5,
      columns: 2,
      rowsPerColumn: 23,
      startXRatio: 0.18,
      startYRatio: 0.15,
      columnGapRatio: 0.34,
      rowGapRatio: 0.07,
      optionGapRatio: 0.048,
      bubbleRadiusRatio: 0.014,
      markThreshold: 0.35,
      ambiguityThreshold: 0.07,
    },
    {
      visualStyle: 'vestibular',
      density: 'balanced',
      answerGridStyle: 'lined',
    },
  ),
  createPreset(
    'school-a4',
    'Prova escolar A4',
    'Modelo institucional para provas de escola com identificação completa.',
    {
      totalQuestions: 30,
      choicesPerQuestion: 5,
      columns: 2,
      rowsPerColumn: 15,
      identification: {
        showStudentName: true,
        showStudentCode: true,
        showClassroom: true,
        showDate: true,
        showExamCode: true,
        showSignature: true,
        showManualIdGrid: false,
        extraFields: ['Professor'],
      },
      header: {
        institutionName: 'Escola',
        examName: 'Avaliacao Bimestral',
        subtitle: 'Cartão-resposta da turma',
        classroomLabel: 'Serie/Turma',
        instructions: 'Marque apenas uma alternativa e preencha todo o campo da bolinha',
        showInstructions: true,
        omrGuidance: 'Bolhas incompletas ou rasuradas podem prejudicar a leitura automática.',
        footerMessage: '',
        footerMessageAlignment: 'center',
        footerMessageWeight: 'regular',
        footerMessageFontSize: 7.5,
        footerPagePosition: 'bottom',
        footerPageTone: 'subtle',
        showInstitutionLogo: false,
        institutionLogoDataUrl: '',
        logoAlignment: 'center',
        logoScale: 1,
        logoMonochrome: false,
      },
    },
    {
      totalQuestions: 30,
      choicesPerQuestion: 5,
      columns: 2,
      rowsPerColumn: 15,
      startXRatio: 0.16,
      startYRatio: 0.22,
      columnGapRatio: 0.36,
      rowGapRatio: 0.056,
      optionGapRatio: 0.05,
      bubbleRadiusRatio: 0.013,
    },
    {
      visualStyle: 'institutional',
      density: 'balanced',
      answerGridStyle: 'classic',
    },
  ),
  createPreset('quiz-20', 'Simulado 20 questões', 'Versão compacta para aplicações rápidas.', {
    totalQuestions: 20,
    choicesPerQuestion: 5,
    columns: 2,
    rowsPerColumn: 10,
  }, {
    totalQuestions: 20,
    choicesPerQuestion: 5,
    columns: 2,
    rowsPerColumn: 10,
    startYRatio: 0.2,
    rowGapRatio: 0.065,
  }, {
    visualStyle: 'compact',
    density: 'compact',
  }),
  createPreset('quiz-45', 'Simulado 45 questões', 'Padrão intermediário para cursinhos e simulados extensos.', {
    totalQuestions: 45,
    choicesPerQuestion: 5,
    columns: 2,
    rowsPerColumn: 23,
  }, {
    totalQuestions: 45,
    choicesPerQuestion: 5,
    columns: 2,
    rowsPerColumn: 23,
  }),
  createPreset('quiz-60', 'Simulado 60 questões', 'Distribui 60 questões com densidade controlada.', {
    totalQuestions: 60,
    choicesPerQuestion: 5,
    columns: 3,
    rowsPerColumn: 20,
  }, {
    totalQuestions: 60,
    choicesPerQuestion: 5,
    columns: 3,
    rowsPerColumn: 20,
    columnGapRatio: 0.24,
    rowGapRatio: 0.055,
    optionGapRatio: 0.041,
    bubbleRadiusRatio: 0.012,
  }),
  createPreset('answer-sheet-4', 'Gabarito 4 alternativas', 'Modelo seguro para provas com A-D.', {
    totalQuestions: 30,
    choicesPerQuestion: 4,
    columns: 2,
    rowsPerColumn: 15,
  }, {
    totalQuestions: 30,
    choicesPerQuestion: 4,
    columns: 2,
    rowsPerColumn: 15,
    optionGapRatio: 0.056,
  }),
  createPreset('answer-sheet-5', 'Gabarito 5 alternativas', 'Modelo seguro para provas com A-E.', {
    totalQuestions: 30,
    choicesPerQuestion: 5,
    columns: 2,
    rowsPerColumn: 15,
  }, {
    totalQuestions: 30,
    choicesPerQuestion: 5,
    columns: 2,
    rowsPerColumn: 15,
  }),
]

export function getCardPresetById(presetId: CardPresetId) {
  return cardTemplatePresets.find((preset) => preset.id === presetId) ?? cardTemplatePresets[0]
}

export function getSafeStructureForCard(
  totalQuestions: number,
  choicesPerQuestion: 2 | 3 | 4 | 5,
  presetId: CardPresetId,
  bubbleSize: CardTemplateDefinition['bubbleSize'] = 'large',
) {
  const preferredColumns = getPreferredColumns(totalQuestions, choicesPerQuestion, presetId)
  const columns = Math.min(getMaxSafeColumns(choicesPerQuestion, bubbleSize), Math.max(1, preferredColumns))

  return {
    columns,
    rowsPerColumn: getSuggestedRowsPerColumn(totalQuestions, columns),
  }
}

export function applySafeCardLayout(state: CardTemplateEditorState) {
  const preset = getCardPresetById(state.presetId)
  const nextState = structuredClone(state)
  nextState.definition.totalQuestions = getResolvedTotalQuestions(nextState.definition)
  const effectiveChoicesPerQuestion = getMaxQuestionBlockChoices(nextState.definition)
  const maxSafeColumns = getMaxSafeColumns(effectiveChoicesPerQuestion, nextState.definition.bubbleSize)
  const manualColumns = Math.min(maxSafeColumns, Math.max(1, Math.round(nextState.definition.columns || 1)))
  const safeRowsPerColumn = getSuggestedRowsPerColumn(nextState.definition.totalQuestions, manualColumns)

  nextState.definition.pageSize = 'A4'
  nextState.definition.optionLabels = normalizeOptionLabels(
    nextState.definition.optionLabels,
    nextState.definition.choicesPerQuestion,
  )
  nextState.definition.questionBlocks = normalizeQuestionBlocks(nextState.definition.questionBlocks, nextState.definition.totalQuestions, {
    choicesPerQuestion: nextState.definition.choicesPerQuestion,
    optionLabels: nextState.definition.optionLabels,
    questionStyle: nextState.visualTheme.answerGridStyle,
  })
  nextState.definition.columns = manualColumns
  nextState.definition.rowsPerColumn = safeRowsPerColumn

  nextState.omrConfig = createTemplateLayoutConfig(nextState.definition.totalQuestions, {
    ...preset.omrConfig,
    markThreshold: nextState.omrConfig.markThreshold,
    ambiguityThreshold: nextState.omrConfig.ambiguityThreshold,
    choicesPerQuestion: effectiveChoicesPerQuestion,
    columns: manualColumns,
    rowsPerColumn: safeRowsPerColumn,
    rowGapRatio: getDensityAdjustedRowGap(preset.omrConfig.rowGapRatio, nextState.visualTheme.density),
  })

  return nextState
}

export function createEditorStateFromPreset(presetId: CardPresetId, name?: string): CardTemplateEditorState {
  const preset = getCardPresetById(presetId)

  return applySafeCardLayout({
    name: name ?? preset.label,
    presetId: preset.id,
    definition: structuredClone(preset.definition),
    visualTheme: structuredClone(preset.visualTheme),
    omrConfig: structuredClone(preset.omrConfig),
  })
}

export function createEditorStateFromTemplate(template: Template): CardTemplateEditorState {
  const definition = structuredClone(template.definition)
  definition.totalQuestions = getResolvedTotalQuestions(definition)
  definition.optionLabels = normalizeOptionLabels(definition.optionLabels, definition.choicesPerQuestion)
  definition.questionBlocks = normalizeQuestionBlocks(definition.questionBlocks, definition.totalQuestions, {
    choicesPerQuestion: definition.choicesPerQuestion,
    optionLabels: definition.optionLabels,
    questionStyle: template.visualTheme.answerGridStyle,
  })

  return {
    name: template.name,
    presetId: template.presetId,
    definition,
    visualTheme: structuredClone(template.visualTheme),
    omrConfig: structuredClone(template.omrConfig),
  }
}


