import type {
  AnswerKey,
  AnswerSheet,
  CardPresetId,
  CardTemplateDefinition,
  CardVisualTheme,
  OMRResult,
  OMRTemplateConfig,
  ProcessingJob,
  StudentResult,
  Template,
} from '../types/omr'
import { createEditorStateFromPreset } from '../utils/cardTemplatePresets'
import { createTemplateLayoutConfig } from '../utils/templateLayout'
import { API_ENDPOINTS, request } from './apiClient'

type BackendUpload = {
  id: string
  examId: string
  studentId: string
  studentName: string
  originalName: string
  createdAt: string
}

type BackendProcessingJob = {
  id: string
  examId: string
  uploadIds: string[]
  templateId: string
  templateVersion: string
  answerKeyId: string
  answerKeyVersion: string
  status: ProcessingJob['status']
  createdAt: string
  updatedAt?: string
  finishedAt?: string
  totalFiles?: number
  processedFiles?: number
  failedFiles?: number
  uploadReports?: ProcessingJob['uploadReports']
  results?: BackendOMRResult[]
}

type BackendStudentResult = {
  id: string
  examId: string
  studentId: string
  studentName: string
  score: number
  correctAnswers: number
  incorrectAnswers: number
  blankAnswers: number
  multipleAnswers: number
  processedAt: string
  omrResultId: string
}

type BackendOMRResult = {
  id: string
  jobId: string
  uploadId: string
  confidenceAverage: number
  answers: Array<{ selectedOption: string | null }>
  blankQuestions: number[]
  multipleMarkedQuestions: number[]
}

type BackendResultsPayload = {
  jobs: BackendProcessingJob[]
  omrResults: BackendOMRResult[]
  studentResults: BackendStudentResult[]
  totalProcessedCards: number
}

type BackendTemplate = {
  id: string
  name: string
  examId: string
  totalQuestions: number
  presetId?: CardPresetId
  version?: string
  definition?: CardTemplateDefinition
  visualTheme?: CardVisualTheme
  omrConfig?: Partial<OMRTemplateConfig>
  createdAt: string
  updatedAt?: string
}

type TemplateMappingOptions = {
  requireDefinition?: boolean
}

export type TemplateCompatibilityWarning = {
  templateId: string
  templateName: string
  missingFields: string[]
  message: string
}

type BackendAnswerKey = {
  id: string
  name: string
  examId: string
  templateId: string
  answers: Array<string | null>
  questions?: AnswerKey['questions']
  defaultScore?: number
  defaultWeight?: number
  essayMaxScore?: number
  totalScore?: number
  annulledScoringMode?: AnswerKey['annulledScoringMode']
  createdAt: string
  updatedAt?: string
}

function withQuery(path: string, query?: Record<string, string | undefined>) {
  if (!query) return path
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  const serialized = params.toString()
  return serialized ? `${path}?${serialized}` : path
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function mapUpload(upload: BackendUpload): AnswerSheet {
  return {
    id: upload.id,
    studentId: upload.studentId,
    studentName: upload.studentName,
    examId: upload.examId,
    fileName: upload.originalName,
    uploadedAt: upload.createdAt,
  }
}

function mapJob(job: BackendProcessingJob): ProcessingJob {
  return {
    id: job.id,
    examId: job.examId,
    sheetIds: job.uploadIds,
    templateId: job.templateId,
    templateVersion: job.templateVersion,
    answerKeyId: job.answerKeyId,
    answerKeyVersion: job.answerKeyVersion,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    finishedAt: job.finishedAt,
    totalFiles: job.totalFiles,
    processedFiles: job.processedFiles,
    failedFiles: job.failedFiles,
    uploadReports: job.uploadReports,
  }
}

function mapStudentResult(result: BackendStudentResult): StudentResult {
  return {
    id: result.id,
    examId: result.examId,
    studentId: result.studentId,
    studentName: result.studentName,
    score: result.score,
    correctAnswers: result.correctAnswers,
    incorrectAnswers: result.incorrectAnswers,
    blankAnswers: result.blankAnswers,
  }
}

function mapOmrResult(result: BackendOMRResult): OMRResult {
  const warnings = [
    ...result.blankQuestions.map((questionNumber) => `Questao ${questionNumber} em branco.`),
    ...result.multipleMarkedQuestions.map((questionNumber) => `Questao ${questionNumber} com marcacao multipla.`),
  ]

  return {
    id: result.id,
    jobId: result.jobId,
    answerSheetId: result.uploadId,
    confidence: result.confidenceAverage,
    detectedAnswers: result.answers.map((answer) => answer.selectedOption ?? '-'),
    warnings,
  }
}

function getMissingTemplateFields(template: BackendTemplate) {
  const missingFields: string[] = []

  if (!template.definition) missingFields.push('definition')
  if (!template.visualTheme) missingFields.push('visualTheme')
  if (!template.presetId) missingFields.push('presetId')

  return missingFields
}

function createTemplateCompatibilityWarning(template: BackendTemplate): TemplateCompatibilityWarning {
  const missingFields = getMissingTemplateFields(template)

  return {
    templateId: template.id,
    templateName: template.name,
    missingFields,
    message: `Template ${template.id} incompatível para telas que dependem da definição completa. Campos ausentes: ${missingFields.join(', ')}.`,
  }
}

function resolveTemplateDefinition(template: BackendTemplate, options?: TemplateMappingOptions) {
  if (template.definition && template.visualTheme && template.presetId) {
    return {
      presetId: template.presetId,
      definition: {
        ...template.definition,
        totalQuestions: template.totalQuestions,
      },
      visualTheme: template.visualTheme,
    }
  }

  if (template.definition && template.presetId && !template.visualTheme) {
    const presetState = createEditorStateFromPreset(template.presetId, template.name)

    return {
      presetId: template.presetId,
      definition: {
        ...template.definition,
        totalQuestions: template.totalQuestions,
      },
      visualTheme: presetState.visualTheme,
    }
  }

  if (!template.definition || !template.visualTheme || !template.presetId) {
    const compatibilityWarning = createTemplateCompatibilityWarning(template)
    if (options?.requireDefinition) {
      throw new Error(compatibilityWarning.message)
    }

    return null
  }

  return null
}

function mapTemplate(template: BackendTemplate, options?: TemplateMappingOptions): Template {
  const resolvedDefinition = resolveTemplateDefinition(template, options)

  if (!resolvedDefinition) {
    throw new Error(`Template ${template.id} sem definicao completa.`)
  }

  return {
    id: template.id,
    name: template.name,
    examId: template.examId,
    totalQuestions: template.totalQuestions,
    presetId: resolvedDefinition.presetId,
    definition: resolvedDefinition.definition,
    visualTheme: resolvedDefinition.visualTheme,
    omrConfig: createTemplateLayoutConfig(template.totalQuestions, template.omrConfig),
    version: template.version ?? 'v1',
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

function mapAnswerKey(answerKey: BackendAnswerKey): AnswerKey {
  return {
    id: answerKey.id,
    name: answerKey.name,
    examId: answerKey.examId,
    templateId: answerKey.templateId,
    version: answerKey.name,
    answers: answerKey.answers,
    questions: answerKey.questions,
    defaultScore: answerKey.defaultScore,
    defaultWeight: answerKey.defaultWeight,
    essayMaxScore: answerKey.essayMaxScore,
    totalScore: answerKey.totalScore,
    annulledScoringMode: answerKey.annulledScoringMode,
    createdAt: answerKey.createdAt,
    updatedAt: answerKey.updatedAt,
  }
}

export const omrService = {
  async createUpload(payload: {
    examId: string
    studentId: string
    files: File[]
  }): Promise<{ endpoint: string; totalFiles: number; items: AnswerSheet[] }> {
    const createdUploads = await Promise.all(
      payload.files.map(async (file) => {
        const formData = new FormData()
        formData.append('examId', payload.examId)
        formData.append('studentId', payload.studentId)
        formData.append('file', file)

        return request<BackendUpload>(API_ENDPOINTS.uploads, {
          method: 'POST',
          body: formData,
        })
      }),
    )

    return {
      endpoint: API_ENDPOINTS.uploads,
      totalFiles: createdUploads.length,
      items: createdUploads.map(mapUpload),
    }
  },

  async getUploads(filters?: { examId?: string; studentId?: string }): Promise<{ endpoint: string; items: AnswerSheet[] }> {
    const endpoint = withQuery(API_ENDPOINTS.uploads, filters)
    const uploads = await request<BackendUpload[]>(endpoint, { method: 'GET' })

    return {
      endpoint,
      items: ensureArray(uploads).map(mapUpload),
    }
  },

  async processUpload(payload: {
    examId: string
    sheetIds: string[]
    templateId: string
    answerKeyId: string
  }): Promise<{ endpoint: string; job: ProcessingJob }> {
    const job = await request<BackendProcessingJob>(API_ENDPOINTS.processOMR, {
      method: 'POST',
      body: {
        examId: payload.examId,
        uploadIds: payload.sheetIds,
        templateId: payload.templateId,
        answerKeyId: payload.answerKeyId,
      },
    })

    return { endpoint: API_ENDPOINTS.processOMR, job: mapJob(job) }
  },

  async getResults(filters?: { examId?: string; jobId?: string }): Promise<{ endpoint: string; jobs: ProcessingJob[]; omr: OMRResult[]; students: StudentResult[] }> {
    const endpoint = withQuery(API_ENDPOINTS.results, filters)
    const results = await request<BackendResultsPayload>(endpoint, { method: 'GET' })

    return {
      endpoint,
      jobs: ensureArray(results.jobs).map(mapJob),
      omr: ensureArray(results.omrResults).map(mapOmrResult),
      students: ensureArray(results.studentResults).map(mapStudentResult),
    }
  },

  async createTemplate(payload: {
    name: string
    examId: string
    totalQuestions: number
    presetId: CardPresetId
    definition: CardTemplateDefinition
    visualTheme: CardVisualTheme
    omrConfig: OMRTemplateConfig
  }): Promise<{ endpoint: string; item: Template }> {
    const template = await request<BackendTemplate>(API_ENDPOINTS.templates, {
      method: 'POST',
      body: payload,
    })

    return { endpoint: API_ENDPOINTS.templates, item: mapTemplate(template) }
  },

  async getTemplates(
    filters?: { examId?: string },
    options?: TemplateMappingOptions,
  ): Promise<{ endpoint: string; items: Template[]; warnings: TemplateCompatibilityWarning[] }> {
    const endpoint = withQuery(API_ENDPOINTS.templates, filters)
    const templates = await request<BackendTemplate[]>(endpoint, { method: 'GET' })
    const items: Template[] = []
    const warnings: TemplateCompatibilityWarning[] = []

    ensureArray(templates).forEach((template) => {
      try {
        const mappedTemplate = mapTemplate(template, options)
        items.push(mappedTemplate)
      } catch (error) {
        const warning = createTemplateCompatibilityWarning(template)
        warnings.push(warning)

        if (options?.requireDefinition) {
          throw error
        }

        console.warn(warning.message)
      }
    })

    return {
      endpoint,
      items,
      warnings,
    }
  },

  async updateTemplate(
    templateId: string,
    payload: {
      name: string
      examId: string
      totalQuestions: number
      presetId: CardPresetId
      definition: CardTemplateDefinition
      visualTheme: CardVisualTheme
      omrConfig: OMRTemplateConfig
    },
  ): Promise<{ endpoint: string; item: Template }> {
    const template = await request<BackendTemplate>(`${API_ENDPOINTS.templates}/${templateId}`, {
      method: 'PUT',
      body: payload,
    })

    return { endpoint: `${API_ENDPOINTS.templates}/${templateId}`, item: mapTemplate(template) }
  },

  async createAnswerKey(payload: {
    name: string
    examId: string
    templateId: string
    answers: Array<string | null>
      questions?: AnswerKey['questions']
      defaultScore?: number
      defaultWeight?: number
      essayMaxScore?: number
      totalScore?: number
      annulledScoringMode?: AnswerKey['annulledScoringMode']
  }): Promise<{ endpoint: string; item: AnswerKey }> {
    const answerKey = await request<BackendAnswerKey>(API_ENDPOINTS.answerKeys, {
      method: 'POST',
      body: payload,
    })

    return { endpoint: API_ENDPOINTS.answerKeys, item: mapAnswerKey(answerKey) }
  },

  async updateAnswerKey(
    answerKeyId: string,
    payload: {
      name: string
      examId: string
      templateId: string
      answers: Array<string | null>
        questions?: AnswerKey['questions']
        defaultScore?: number
        defaultWeight?: number
        essayMaxScore?: number
        totalScore?: number
        annulledScoringMode?: AnswerKey['annulledScoringMode']
      },
  ): Promise<{ endpoint: string; item: AnswerKey }> {
    const endpoint = `${API_ENDPOINTS.answerKeys}/${answerKeyId}`
    const answerKey = await request<BackendAnswerKey>(endpoint, {
      method: 'PUT',
      body: payload,
    })

    return { endpoint, item: mapAnswerKey(answerKey) }
  },

  async getAnswerKeys(filters?: { examId?: string; templateId?: string }): Promise<{ endpoint: string; items: AnswerKey[] }> {
    const endpoint = withQuery(API_ENDPOINTS.answerKeys, filters)
    const answerKeys = await request<BackendAnswerKey[]>(endpoint, { method: 'GET' })

    return {
      endpoint,
      items: ensureArray(answerKeys).map(mapAnswerKey),
    }
  },
}
