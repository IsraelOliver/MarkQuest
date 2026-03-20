import { db } from '../repositories/in-memory.repository.js'
import type { AnswerKey, BubbleOption } from '../types/entities.js'
import { generateId } from '../utils/id.js'
import { AppError } from '../utils/app-error.js'

export class AnswerKeyService {
  create(input: { name: string; examId: string; templateId: string; answers: BubbleOption[] }): AnswerKey {
    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada para gabarito não existe.', 404)
    }

    const template = db.templates.find((item) => item.id === input.templateId)
    if (!template) {
      throw new AppError('TEMPLATE_NOT_FOUND', 'Template informado para gabarito não existe.', 404)
    }

    if (template.totalQuestions !== input.answers.length) {
      throw new AppError(
        'ANSWER_KEY_SIZE_MISMATCH',
        `Gabarito deve ter ${template.totalQuestions} respostas para o template selecionado.`,
        400,
      )
    }

    const key: AnswerKey = {
      id: generateId('key'),
      name: input.name,
      examId: input.examId,
      templateId: input.templateId,
      answers: input.answers,
      createdAt: new Date().toISOString(),
    }

    db.answerKeys.push(key)
    db.persist()
    return key
  }

  list(): AnswerKey[] {
    return db.answerKeys
  }

  findById(id: string): AnswerKey | undefined {
    return db.answerKeys.find((item) => item.id === id)
  }

  findLatestByExamAndTemplate(examId: string, templateId: string): AnswerKey | undefined {
    return [...db.answerKeys]
      .reverse()
      .find((item) => item.examId === examId && item.templateId === templateId)
  }
}
