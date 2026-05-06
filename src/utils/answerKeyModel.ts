import type { AnswerKey, AnswerKeyQuestion, AnswerKeyQuestionStatus, CardQuestionStyle, Template } from '../types/omr'
import { buildNormalizedRenderModel, getMathAllowedCharacters } from './questionBlocks'
import type { LogicalQuestionType, ResolvedQuestion } from './questionBlocks'
import { normalizeOptionLabels } from './optionLabels'

const FALLBACK_OPTIONS = ['A', 'B', 'C', 'D', 'E']

function normalizeChoiceCount(value: number | undefined): 2 | 3 | 4 | 5 {
  return value === 2 || value === 3 || value === 4 || value === 5 ? value : 5
}

function normalizeQuestionStyle(value: string | undefined): CardQuestionStyle {
  return value === 'lined' || value === 'minimal' ? value : 'classic'
}

function normalizeTemplateDefinition(template: Template) {
  const definition = template.definition
  const choicesPerQuestion = normalizeChoiceCount(definition?.choicesPerQuestion)

  return {
    enableQuestionBlocks: Boolean(definition?.enableQuestionBlocks),
    questionBlocks: Array.isArray(definition?.questionBlocks) ? definition.questionBlocks : [],
    totalQuestions: Math.max(0, Math.round(template.totalQuestions ?? definition?.totalQuestions ?? 0)),
    choicesPerQuestion,
    optionLabels: normalizeOptionLabels(definition?.optionLabels, choicesPerQuestion),
    questionStyle: normalizeQuestionStyle(definition?.questionStyle),
  }
}

function getObjectiveQuestionByNumber(questions: ResolvedQuestion[]) {
  return new Map(questions.map((question) => [question.questionNumber, question] as const))
}

function getQuestionKind(type: LogicalQuestionType, objectiveQuestion: ResolvedQuestion | undefined): AnswerKeyQuestion['questionKind'] {
  if (type === 'math' || type === 'open' || type === 'image' || type === 'essay') return type

  const options = objectiveQuestion?.alternativeLabels ?? FALLBACK_OPTIONS
  if (options.length === 2 && options.join('') === 'CE') return 'ce'
  if (options.length === 4) return 'ad'
  return 'ae'
}

function getDefaultStatus(questionType: LogicalQuestionType): AnswerKeyQuestionStatus {
  return questionType === 'objective' ? 'active' : 'manual'
}

function getGroupMeta(
  questionType: LogicalQuestionType,
  questionKind: AnswerKeyQuestion['questionKind'],
  validOptions: string[],
  markerLabel: string | undefined,
) {
  if (questionType === 'objective') {
    if (questionKind === 'ce') return { groupKey: 'objective:ce', groupLabel: 'C/E' }
    if (questionKind === 'ad') return { groupKey: 'objective:abcd', groupLabel: 'ABCD' }
    return { groupKey: `objective:${validOptions.join('') || 'ae'}`, groupLabel: validOptions.join('') || 'A-E' }
  }

  if (questionType === 'math') {
    return { groupKey: `math:${markerLabel ?? 'tipo-b'}`, groupLabel: `Matemática / ${markerLabel ?? 'Tipo B'}` }
  }

  if (questionType === 'open') {
    return { groupKey: `open:${markerLabel ?? 'tipo-d'}`, groupLabel: `Discursiva / ${markerLabel ?? 'Tipo D'}` }
  }

  if (questionType === 'essay') {
    return { groupKey: 'essay:redacao', groupLabel: 'Redação' }
  }

  return { groupKey: `image:${markerLabel ?? 'imagem'}`, groupLabel: `Imagem / ${markerLabel ?? 'Manual'}` }
}

export function buildAnswerKeyQuestionModel(template: Template, answerKey?: AnswerKey | null): AnswerKeyQuestion[] {
  const definition = normalizeTemplateDefinition(template)
  const renderModel = buildNormalizedRenderModel(definition)
  const objectiveQuestionByNumber = getObjectiveQuestionByNumber(renderModel.questions)
  const metadataByQuestion = new Map(answerKey?.questions?.map((question) => [question.questionNumber, question] as const) ?? [])

  return renderModel.logicalQuestions.map((logicalQuestion) => {
    const objectiveQuestion = objectiveQuestionByNumber.get(logicalQuestion.number)
    const metadata = metadataByQuestion.get(logicalQuestion.number)
    const validOptions = logicalQuestion.type === 'objective' ? objectiveQuestion?.alternativeLabels ?? definition.optionLabels : []
    const legacyAnswer = answerKey?.answers?.[logicalQuestion.number - 1] ?? null
    const correctAnswer =
      metadata?.correctAnswer ?? (logicalQuestion.type === 'objective' && validOptions.includes(legacyAnswer ?? '') ? legacyAnswer : null)
    const status = metadata?.status ?? getDefaultStatus(logicalQuestion.type)
    const score = Number.isFinite(metadata?.score) ? metadata?.score ?? 1 : answerKey?.defaultScore ?? 1
    const weight =
      Number.isFinite(metadata?.weight) && (metadata?.weight ?? 0) > 0 ? metadata?.weight ?? 1 : answerKey?.defaultWeight ?? 1
    const maxScore =
      Number.isFinite(metadata?.maxScore)
        ? metadata?.maxScore
        : logicalQuestion.type === 'essay'
          ? answerKey?.essayMaxScore ?? score
          : logicalQuestion.type === 'open'
            ? score
            : undefined
    const responseColumns = logicalQuestion.answerModel.type === 'math' ? logicalQuestion.answerModel.columns : metadata?.responseColumns
    const allowedCharacters =
      logicalQuestion.answerModel.type === 'math'
        ? logicalQuestion.answerModel.allowedCharacters
        : metadata?.allowedCharacters
    const questionKind = getQuestionKind(logicalQuestion.type, objectiveQuestion)
    const group = getGroupMeta(logicalQuestion.type, questionKind, validOptions, logicalQuestion.markerLabel)

    return {
      questionNumber: logicalQuestion.number,
      questionType: logicalQuestion.type,
      questionKind,
      sourceSectionId: logicalQuestion.linkedSectionId ?? logicalQuestion.sourceSectionId,
      sourceSectionTitle: objectiveQuestion?.blockTitle ?? group.groupLabel,
      markerLabel: logicalQuestion.markerLabel,
      groupKey: metadata?.groupKey ?? group.groupKey,
      groupLabel: metadata?.groupLabel ?? group.groupLabel,
      validOptions,
      correctAnswer,
      allowedCharacters,
      responseColumns,
      score,
      weight,
      maxScore,
      status,
    }
  })
}

export function buildLegacyAnswers(questions: AnswerKeyQuestion[], totalQuestions: number) {
  const questionByNumber = new Map(
    questions
      .filter((question) => question.questionType === 'objective')
      .map((question) => [question.questionNumber, question] as const),
  )

  return Array.from({ length: totalQuestions }, (_, index) => {
    const question = questionByNumber.get(index + 1)
    if (question?.correctAnswer && question.validOptions.includes(question.correctAnswer)) return question.correctAnswer
    return null
  })
}

export function getQuestionBaseScore(question: AnswerKeyQuestion) {
  if (question.questionType === 'open' || question.questionType === 'essay') {
    return question.maxScore ?? question.score
  }
  return question.score
}

export function calculateQuestionFinalScore(question: AnswerKeyQuestion) {
  if (question.status === 'annulled') return 0
  if ((question.questionType === 'objective' || question.questionType === 'math') && !question.correctAnswer) return 0
  return getQuestionBaseScore(question) * question.weight
}

export function calculateAnswerKeyScore(questions: AnswerKeyQuestion[]) {
  return questions.reduce((sum, question) => sum + calculateQuestionFinalScore(question), 0)
}

export function getMathAnswerCharacters(question: AnswerKeyQuestion) {
  if (question.questionType !== 'math') return []
  if (question.allowedCharacters?.length) return question.allowedCharacters
  return getMathAllowedCharacters([])
}
