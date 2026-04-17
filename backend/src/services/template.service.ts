import { DEFAULT_TEMPLATE_CONFIG_20Q } from '../modules/omr/template-map.js'
import { db } from '../repositories/in-memory.repository.js'
import type { CardPresetId, CardTemplateDefinition, CardVisualTheme, OMRTemplateConfig, Template } from '../types/entities.js'
import { AppError } from '../utils/app-error.js'
import { generateId } from '../utils/id.js'

function getMaxQuestionBlockChoices(definition: CardTemplateDefinition) {
  return definition.questionBlocks.reduce<2 | 3 | 4 | 5>(
    (maxChoices, block) =>
      block.sectionType === 'objective' && block.choicesPerQuestion > maxChoices ? block.choicesPerQuestion : maxChoices,
    definition.choicesPerQuestion,
  )
}

function getNextTemplateVersion(currentVersion?: string) {
  const parsed = Number(currentVersion?.replace(/^v/i, ''))
  if (!Number.isFinite(parsed) || parsed < 1) return 'v1'
  return `v${Math.round(parsed) + 1}`
}

function isValidOptionLabel(label: string) {
  return /^[A-Z0-9]$/.test(label)
}

function assertUniqueOptionLabels(
  optionLabels: string[],
  choicesPerQuestion: number,
  options: { invalidCode: string; invalidMessage: string; duplicateCode: string; duplicateMessage: string },
) {
  if (optionLabels.length !== choicesPerQuestion) {
    throw new AppError(options.invalidCode, options.invalidMessage, 400)
  }

  if (!optionLabels.every((label) => isValidOptionLabel(label))) {
    throw new AppError(options.invalidCode, options.invalidMessage, 400)
  }

  const normalizedLabels = optionLabels.map((label) => label.toUpperCase())
  if (new Set(normalizedLabels).size !== normalizedLabels.length) {
    throw new AppError(options.duplicateCode, options.duplicateMessage, 400)
  }
}

export class TemplateService {
  private buildOperationalConfig(
    definition: CardTemplateDefinition,
    omrConfig: Partial<OMRTemplateConfig> | undefined,
    totalQuestions: number,
  ): OMRTemplateConfig {
    const effectiveChoicesPerQuestion = getMaxQuestionBlockChoices(definition)

    return {
      ...DEFAULT_TEMPLATE_CONFIG_20Q,
      ...omrConfig,
      totalQuestions,
      choicesPerQuestion: effectiveChoicesPerQuestion,
      columns: definition.columns,
      rowsPerColumn: definition.rowsPerColumn,
    }
  }

  private assertTemplateConsistency(input: {
    examId: string
    totalQuestions: number
    definition: CardTemplateDefinition
  }) {
    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada nao existe.', 404)
    }

    if (exam.totalQuestions !== input.totalQuestions) {
      throw new AppError('EXAM_TEMPLATE_TOTAL_MISMATCH', 'O template precisa usar o mesmo total de questoes da prova.', 400)
    }

    if (input.definition.totalQuestions !== input.totalQuestions) {
      throw new AppError('TEMPLATE_DEFINITION_TOTAL_MISMATCH', 'A definicao visual do template diverge do total de questoes informado.', 400)
    }

    assertUniqueOptionLabels(input.definition.optionLabels, input.definition.choicesPerQuestion, {
      invalidCode: 'TEMPLATE_OPTION_LABELS_INVALID',
      invalidMessage: 'Use apenas letras de A a Z ou numeros de 0 a 9 nas alternativas do template.',
      duplicateCode: 'TEMPLATE_OPTION_LABELS_DUPLICATE',
      duplicateMessage: 'As alternativas do template nao podem repetir letras ou numeros.',
    })

    for (const block of input.definition.questionBlocks) {
      if (block.sectionType !== 'objective') continue

      if (block.startQuestion > block.endQuestion) {
        throw new AppError('QUESTION_BLOCK_INVALID_RANGE', 'Um bloco de questoes possui intervalo invalido.', 400)
      }

      if (block.endQuestion > input.totalQuestions) {
        throw new AppError('QUESTION_BLOCK_OUT_OF_RANGE', 'Um bloco de questoes ultrapassa o total da prova.', 400)
      }

      assertUniqueOptionLabels(block.optionLabels, block.choicesPerQuestion, {
        invalidCode: 'QUESTION_BLOCK_OPTION_LABELS_INVALID',
        invalidMessage: 'Use apenas letras de A a Z ou numeros de 0 a 9 nas alternativas de cada bloco.',
        duplicateCode: 'QUESTION_BLOCK_OPTION_LABELS_DUPLICATE',
        duplicateMessage: 'As alternativas de um bloco nao podem repetir letras ou numeros.',
      })
    }
  }

  create(input: {
    name: string
    examId: string
    totalQuestions: number
    presetId: CardPresetId
    definition: CardTemplateDefinition
    visualTheme: CardVisualTheme
    omrConfig?: Partial<OMRTemplateConfig>
  }): Template {
    this.assertTemplateConsistency(input)

    const template: Template = {
      id: generateId('tpl'),
      name: input.name,
      examId: input.examId,
      totalQuestions: input.totalQuestions,
      presetId: input.presetId,
      version: 'v1',
      definition: input.definition,
      visualTheme: input.visualTheme,
      omrConfig: this.buildOperationalConfig(input.definition, input.omrConfig, input.totalQuestions),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    db.templates.push(template)
    db.persist()
    return template
  }

  list(filters?: { examId?: string }): Template[] {
    return db.templates.filter((item) => !filters?.examId || item.examId === filters.examId)
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
      throw new AppError('TEMPLATE_NOT_FOUND', 'Template informado nao existe.', 404)
    }

    this.assertTemplateConsistency(input)

    const currentTemplate = db.templates[templateIndex]
    const updatedTemplate: Template = {
      ...currentTemplate,
      name: input.name,
      examId: input.examId,
      totalQuestions: input.totalQuestions,
      presetId: input.presetId,
      version: getNextTemplateVersion(currentTemplate.version),
      definition: input.definition,
      visualTheme: input.visualTheme,
      omrConfig: this.buildOperationalConfig(input.definition, { ...currentTemplate.omrConfig, ...input.omrConfig }, input.totalQuestions),
      updatedAt: new Date().toISOString(),
    }

    db.templates[templateIndex] = updatedTemplate
    db.persist()
    return updatedTemplate
  }
}
