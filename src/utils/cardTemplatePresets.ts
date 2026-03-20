import type {
  CardPresetId,
  CardTemplateDefinition,
  CardTemplateEditorState,
  CardVisualTheme,
  OMRTemplateConfig,
  Template,
} from '../types/omr'
import { createTemplateLayoutConfig, getSuggestedRowsPerColumn } from './templateLayout'

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
  const totalQuestions = input.totalQuestions ?? 45
  const columns = input.columns ?? 2
  const choicesPerQuestion = input.choicesPerQuestion ?? 5

  return {
    pageSize: 'A4',
    totalQuestions,
    choicesPerQuestion,
    columns,
    rowsPerColumn: input.rowsPerColumn ?? getSuggestedRowsPerColumn(totalQuestions, columns),
    numberingMode: input.numberingMode ?? 'continuous',
    groupByArea: input.groupByArea ?? false,
    showBlockTitles: input.showBlockTitles ?? false,
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
      institutionName: input.header?.institutionName ?? 'Instituicao',
      examName: input.header?.examName ?? 'Cartao-resposta',
      subtitle: input.header?.subtitle ?? 'Preencha com caneta preta ou azul.',
      classroomLabel: input.header?.classroomLabel ?? 'Turma',
      instructions:
        input.header?.instructions ?? 'Marque apenas uma alternativa por questao e preencha totalmente a bolha.',
      omrGuidance:
        input.header?.omrGuidance ?? 'Evite rasuras, marcas leves e dobras na area de respostas.',
      showInstitutionLogo: input.header?.showInstitutionLogo ?? false,
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

function getMaxSafeColumns(choicesPerQuestion: 4 | 5) {
  return choicesPerQuestion === 4 ? 3 : 3
}

function getPreferredColumns(totalQuestions: number, choicesPerQuestion: 4 | 5, presetId: CardPresetId) {
  if (presetId === 'quiz-20') return 2
  if (presetId === 'quiz-60') return 3

  if (choicesPerQuestion === 4) {
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
    'Modelo equilibrado para provas longas com 45 questoes e 5 alternativas.',
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
        institutionName: 'Instituicao',
        examName: 'Simulado ENEM',
        subtitle: 'Cartao-resposta oficial',
        classroomLabel: 'Turma',
        instructions: 'Marque apenas uma alternativa por questao e mantenha o cartao limpo.',
        omrGuidance: 'Use caneta escura e evite dobras na folha.',
        showInstitutionLogo: false,
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
    'Modelo institucional para provas de escola com identificacao completa.',
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
        subtitle: 'Cartao-resposta da turma',
        classroomLabel: 'Serie/Turma',
        instructions: 'Confira seus dados e marque a alternativa escolhida com atencao.',
        omrGuidance: 'Bolhas incompletas ou rasuradas podem prejudicar a leitura automatica.',
        showInstitutionLogo: false,
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
  createPreset('quiz-20', 'Simulado 20 questoes', 'Versao compacta para aplicacoes rapidas.', {
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
  createPreset('quiz-45', 'Simulado 45 questoes', 'Padrao intermediario para cursinhos e simulados extensos.', {
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
  createPreset('quiz-60', 'Simulado 60 questoes', 'Distribui 60 questoes com densidade controlada.', {
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
  choicesPerQuestion: 4 | 5,
  presetId: CardPresetId,
) {
  const preferredColumns = getPreferredColumns(totalQuestions, choicesPerQuestion, presetId)
  const columns = Math.min(getMaxSafeColumns(choicesPerQuestion), Math.max(1, preferredColumns))

  return {
    columns,
    rowsPerColumn: getSuggestedRowsPerColumn(totalQuestions, columns),
  }
}

export function applySafeCardLayout(state: CardTemplateEditorState) {
  const preset = getCardPresetById(state.presetId)
  const nextState = structuredClone(state)
  const safeStructure = getSafeStructureForCard(
    nextState.definition.totalQuestions,
    nextState.definition.choicesPerQuestion,
    nextState.presetId,
  )

  nextState.definition.pageSize = 'A4'
  nextState.definition.columns = safeStructure.columns
  nextState.definition.rowsPerColumn = safeStructure.rowsPerColumn

  nextState.omrConfig = createTemplateLayoutConfig(nextState.definition.totalQuestions, {
    ...preset.omrConfig,
    markThreshold: nextState.omrConfig.markThreshold,
    ambiguityThreshold: nextState.omrConfig.ambiguityThreshold,
    choicesPerQuestion: nextState.definition.choicesPerQuestion,
    columns: safeStructure.columns,
    rowsPerColumn: safeStructure.rowsPerColumn,
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
  return applySafeCardLayout({
    name: template.name,
    presetId: template.presetId,
    definition: structuredClone(template.definition),
    visualTheme: structuredClone(template.visualTheme),
    omrConfig: structuredClone(template.omrConfig),
  })
}
