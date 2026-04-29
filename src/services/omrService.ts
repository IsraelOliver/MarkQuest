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

type BackendAnswerKey = {
  id: string
  name: string
  examId: string
  templateId: string
  answers: string[]
  createdAt: string
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

function mapTemplate(template: BackendTemplate): Template {
  const fallbackState = createEditorStateFromPreset('enem-a4', template.name)

  return {
    id: template.id,
    name: template.name,
    examId: template.examId,
    totalQuestions: template.totalQuestions,
    presetId: template.presetId ?? fallbackState.presetId,
    definition: template.definition
      ? {
          ...template.definition,
          totalQuestions: template.totalQuestions,
        }
      : {
          ...fallbackState.definition,
          totalQuestions: template.totalQuestions,
        },
    visualTheme: template.visualTheme ?? fallbackState.visualTheme,
    omrConfig: createTemplateLayoutConfig(template.totalQuestions, template.omrConfig),
    version: template.version ?? 'v1',
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

function mapAnswerKey(answerKey: BackendAnswerKey): AnswerKey {
  return {
    id: answerKey.id,
    examId: answerKey.examId,
    templateId: answerKey.templateId,
    version: answerKey.name,
    answers: answerKey.answers,
    createdAt: answerKey.createdAt,
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
      items: uploads.map(mapUpload),
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
      jobs: results.jobs.map(mapJob),
      omr: results.omrResults.map(mapOmrResult),
      students: results.studentResults.map(mapStudentResult),
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

  async getTemplates(filters?: { examId?: string }): Promise<{ endpoint: string; items: Template[] }> {
    const endpoint = withQuery(API_ENDPOINTS.templates, filters)
    const templates = await request<BackendTemplate[]>(endpoint, { method: 'GET' })

    return {
      endpoint,
      items: templates.map(mapTemplate),
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
    answers: string[]
  }): Promise<{ endpoint: string; item: AnswerKey }> {
    const answerKey = await request<BackendAnswerKey>(API_ENDPOINTS.answerKeys, {
      method: 'POST',
      body: payload,
    })

    return { endpoint: API_ENDPOINTS.answerKeys, item: mapAnswerKey(answerKey) }
  },

  async getAnswerKeys(filters?: { examId?: string; templateId?: string }): Promise<{ endpoint: string; items: AnswerKey[] }> {
    const endpoint = withQuery(API_ENDPOINTS.answerKeys, filters)
    const answerKeys = await request<BackendAnswerKey[]>(endpoint, { method: 'GET' })

    return {
      endpoint,
      items: answerKeys.map(mapAnswerKey),
    }
  },
}
