import { db } from '../repositories/in-memory.repository.js'
import type { AnswerKey, AnswerKeyQuestion, BubbleOption, CardTemplateSection, Template } from '../types/entities.js'
import { AppError } from '../utils/app-error.js'
import { generateId } from '../utils/id.js'

const BUBBLE_OPTIONS = new Set(['A', 'B', 'C', 'D', 'E'])

function collectTemplateAllowedOptions(template: Template) {
  const options = new Set<BubbleOption>()
  const addOption = (value: string | undefined) => {
    if (value && BUBBLE_OPTIONS.has(value)) options.add(value as BubbleOption)
  }

  template.definition.optionLabels?.forEach(addOption)
  template.definition.questionBlocks?.forEach((section: CardTemplateSection) => {
    if (section.sectionType !== 'objective') return
    section.optionLabels?.forEach(addOption)
  })

  if (options.size === 0) {
    const fallbackOptions: BubbleOption[] = ['A', 'B', 'C', 'D', 'E']
    fallbackOptions.forEach((option) => options.add(option))
  }

  return options
}

export class AnswerKeyService {
  private validateQuestion(template: Template, question: AnswerKeyQuestion) {
    if (question.questionType === 'objective') {
      if (question.questionNumber > template.totalQuestions) return false
      const allowedOptions = collectTemplateAllowedOptions(template)
      if (question.correctAnswer && !allowedOptions.has(question.correctAnswer as BubbleOption)) return false
      if (question.correctAnswer && question.validOptions.length > 0 && !question.validOptions.includes(question.correctAnswer)) return false
      return true
    }

    if (question.correctAnswer && question.allowedCharacters?.length) {
      const answerCharacters = [...question.correctAnswer]
      if (answerCharacters.some((character) => !question.allowedCharacters?.includes(character))) return false
    }

    if (question.correctAnswer && question.responseColumns && question.correctAnswer.length > question.responseColumns) {
      return false
    }

    if (question.questionType === 'math' && question.correctAnswer) {
      const allowedCharacters = new Set(question.allowedCharacters ?? [])
      const allowsNegative = allowedCharacters.has('-')
      const allowedDecimalSeparators = [',', '.'].filter((character) => allowedCharacters.has(character))
      let hasNegative = false
      let hasDecimalSeparator = false

      for (let index = 0; index < question.correctAnswer.length; index += 1) {
        const character = question.correctAnswer[index]

        if (character >= '0' && character <= '9') continue

        if (character === '-') {
          if (!allowsNegative || hasNegative || index !== 0) return false
          hasNegative = true
          continue
        }

        if (character === ',' || character === '.') {
          if (!allowedDecimalSeparators.includes(character) || hasDecimalSeparator) return false
          hasDecimalSeparator = true
          continue
        }

        return false
      }
    }

    return true
  }

  create(input: {
    name: string
    examId: string
    templateId: string
    answers: Array<BubbleOption | null>
    questions?: AnswerKeyQuestion[]
    defaultScore?: number
    defaultWeight?: number
    essayMaxScore?: number
    totalScore?: number
    annulledScoringMode?: AnswerKey['annulledScoringMode']
  }): AnswerKey {
    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada para gabarito nao existe.', 404)
    }

    const template = db.templates.find((item) => item.id === input.templateId)
    if (!template) {
      throw new AppError('TEMPLATE_NOT_FOUND', 'Template informado para gabarito nao existe.', 404)
    }

    if (template.examId !== input.examId) {
      throw new AppError('ANSWER_KEY_TEMPLATE_EXAM_MISMATCH', 'O gabarito precisa usar um template da mesma prova.', 400)
    }

    if (template.totalQuestions !== input.answers.length) {
      throw new AppError('ANSWER_KEY_SIZE_MISMATCH', `Gabarito deve ter ${template.totalQuestions} respostas para o template selecionado.`, 400)
    }

    const allowedOptions = collectTemplateAllowedOptions(template)
    const invalidAnswer = input.answers.find((answer) => answer !== null && !allowedOptions.has(answer))
    if (invalidAnswer) {
      throw new AppError('ANSWER_KEY_OPTION_INVALID', `A resposta ${invalidAnswer} nao pertence ao alfabeto configurado no template.`, 400)
    }

    const invalidQuestion = input.questions?.find((question) => !this.validateQuestion(template, question))
    if (invalidQuestion) {
      throw new AppError('ANSWER_KEY_QUESTION_INVALID', 'Uma questao do gabarito possui dados incompativeis com o template.', 400)
    }

    const key: AnswerKey = {
      id: generateId('key'),
      name: input.name,
      examId: input.examId,
      templateId: input.templateId,
      answers: input.answers,
      questions: input.questions,
      defaultScore: input.defaultScore,
      defaultWeight: input.defaultWeight,
      essayMaxScore: input.essayMaxScore,
      totalScore: input.totalScore,
      annulledScoringMode: input.annulledScoringMode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    db.answerKeys.push(key)
    db.persist()
    return key
  }

  list(filters?: { examId?: string; templateId?: string }): AnswerKey[] {
    return db.answerKeys.filter((item) => {
      if (filters?.examId && item.examId !== filters.examId) return false
      if (filters?.templateId && item.templateId !== filters.templateId) return false
      return true
    })
  }

  findById(id: string): AnswerKey | undefined {
    return db.answerKeys.find((item) => item.id === id)
  }

  findLatestByExamAndTemplate(examId: string, templateId: string): AnswerKey | undefined {
    return [...db.answerKeys].reverse().find((item) => item.examId === examId && item.templateId === templateId)
  }

  update(
    id: string,
    input: {
      name: string
      examId: string
      templateId: string
      answers: Array<BubbleOption | null>
        questions?: AnswerKeyQuestion[]
        defaultScore?: number
        defaultWeight?: number
        essayMaxScore?: number
        totalScore?: number
        annulledScoringMode?: AnswerKey['annulledScoringMode']
      },
  ) {
    const answerKeyIndex = db.answerKeys.findIndex((item) => item.id === id)
    if (answerKeyIndex < 0) {
      throw new AppError('ANSWER_KEY_NOT_FOUND', 'Gabarito informado nao existe.', 404)
    }

    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada para gabarito nao existe.', 404)
    }

    const template = db.templates.find((item) => item.id === input.templateId)
    if (!template) {
      throw new AppError('TEMPLATE_NOT_FOUND', 'Template informado para gabarito nao existe.', 404)
    }

    if (template.examId !== input.examId) {
      throw new AppError('ANSWER_KEY_TEMPLATE_EXAM_MISMATCH', 'O gabarito precisa usar um template da mesma prova.', 400)
    }

    if (template.totalQuestions !== input.answers.length) {
      throw new AppError('ANSWER_KEY_SIZE_MISMATCH', `Gabarito deve ter ${template.totalQuestions} respostas para o template selecionado.`, 400)
    }

    const allowedOptions = collectTemplateAllowedOptions(template)
    const invalidAnswer = input.answers.find((answer) => answer !== null && !allowedOptions.has(answer))
    if (invalidAnswer) {
      throw new AppError('ANSWER_KEY_OPTION_INVALID', `A resposta ${invalidAnswer} nao pertence ao alfabeto configurado no template.`, 400)
    }

    const invalidQuestion = input.questions?.find((question) => !this.validateQuestion(template, question))
    if (invalidQuestion) {
      throw new AppError('ANSWER_KEY_QUESTION_INVALID', 'Uma questao do gabarito possui dados incompativeis com o template.', 400)
    }

    const currentKey = db.answerKeys[answerKeyIndex]
    const updatedKey: AnswerKey = {
      ...currentKey,
      name: input.name,
      examId: input.examId,
      templateId: input.templateId,
      answers: input.answers,
        questions: input.questions,
        defaultScore: input.defaultScore,
        defaultWeight: input.defaultWeight,
        essayMaxScore: input.essayMaxScore,
        totalScore: input.totalScore,
        annulledScoringMode: input.annulledScoringMode,
        updatedAt: new Date().toISOString(),
      }

    db.answerKeys[answerKeyIndex] = updatedKey
    db.persist()
    return updatedKey
  }
}
