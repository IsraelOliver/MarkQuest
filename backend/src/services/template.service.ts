import { db } from '../repositories/in-memory.repository.js'
import type { CardPresetId, CardTemplateDefinition, CardVisualTheme, OMRTemplateConfig, Template } from '../types/entities.js'
import { generateId } from '../utils/id.js'
import { DEFAULT_TEMPLATE_CONFIG_20Q } from '../modules/omr/template-map.js'
import { AppError } from '../utils/app-error.js'

export class TemplateService {
  create(input: {
    name: string
    examId: string
    totalQuestions: number
    presetId: CardPresetId
    definition: CardTemplateDefinition
    visualTheme: CardVisualTheme
    omrConfig?: Partial<OMRTemplateConfig>
  }): Template {
    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada não existe.', 404)
    }

    const template: Template = {
      id: generateId('tpl'),
      name: input.name,
      examId: input.examId,
      totalQuestions: input.totalQuestions,
      presetId: input.presetId,
      definition: input.definition,
      visualTheme: input.visualTheme,
      omrConfig: {
        ...DEFAULT_TEMPLATE_CONFIG_20Q,
        totalQuestions: input.totalQuestions,
        ...input.omrConfig,
      },
      createdAt: new Date().toISOString(),
    }

    db.templates.push(template)
    db.persist()
    return template
  }

  list(): Template[] {
    return db.templates
  }

  findById(id: string): Template | undefined {
    return db.templates.find((item) => item.id === id)
  }

  findLatestByExam(examId: string): Template | undefined {
    return [...db.templates].reverse().find((item) => item.examId === examId)
  }

  update(
    id: string,
    input: {
      name: string
      examId: string
      totalQuestions: number
      presetId: CardPresetId
      definition: CardTemplateDefinition
      visualTheme: CardVisualTheme
      omrConfig?: Partial<OMRTemplateConfig>
    },
  ): Template {
    const templateIndex = db.templates.findIndex((item) => item.id === id)
    if (templateIndex < 0) {
      throw new AppError('TEMPLATE_NOT_FOUND', 'Template informado não existe.', 404)
    }

    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada não existe.', 404)
    }

    const currentTemplate = db.templates[templateIndex]
    const updatedTemplate: Template = {
      ...currentTemplate,
      name: input.name,
      examId: input.examId,
      totalQuestions: input.totalQuestions,
      presetId: input.presetId,
      definition: input.definition,
      visualTheme: input.visualTheme,
      omrConfig: {
        ...DEFAULT_TEMPLATE_CONFIG_20Q,
        ...currentTemplate.omrConfig,
        totalQuestions: input.totalQuestions,
        ...input.omrConfig,
      },
    }

    db.templates[templateIndex] = updatedTemplate
    db.persist()
    return updatedTemplate
  }
}
