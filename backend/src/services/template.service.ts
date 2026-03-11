import { db } from '../repositories/in-memory.repository.js'
import type { OMRTemplateConfig, Template } from '../types/entities.js'
import { generateId } from '../utils/id.js'
import { DEFAULT_TEMPLATE_CONFIG_20Q } from '../modules/omr/template-map.js'

export class TemplateService {
  create(input: {
    name: string
    examId: string
    totalQuestions: number
    omrConfig?: Partial<OMRTemplateConfig>
  }): Template {
    const template: Template = {
      id: generateId('tpl'),
      name: input.name,
      examId: input.examId,
      totalQuestions: input.totalQuestions,
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
}
