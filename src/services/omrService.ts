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
import { formatStudentLabel } from '../utils/display'

type BackendUpload = {
  id: string
  examId: string
  studentId: string
  originalName: string
  createdAt: string
}

type BackendProcessingJob = {
  id: string
  examId: string
  uploadIds: string[]
  status: ProcessingJob['status']
  createdAt: string
  finishedAt?: string
}

type BackendStudentResult = {
  id: string
  examId: string
  studentId: string
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

function mapUpload(upload: BackendUpload): AnswerSheet {
  return {
    id: upload.id,
    studentId: upload.studentId,
    studentName: formatStudentLabel(upload.studentId),
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
    status: job.status,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt,
  }
}

function mapStudentResult(result: BackendStudentResult): StudentResult {
  return {
    id: result.id,
    examId: result.examId,
    studentId: result.studentId,
    studentName: formatStudentLabel(result.studentId),
    score: result.score,
    correctAnswers: result.correctAnswers,
    incorrectAnswers: result.incorrectAnswers,
    blankAnswers: result.blankAnswers,
  }
}

function mapOmrResult(result: BackendOMRResult): OMRResult {
  const warnings = [
    ...result.blankQuestions.map((questionNumber) => `Questão ${questionNumber} em branco.`),
    ...result.multipleMarkedQuestions.map((questionNumber) => `Questão ${questionNumber} com marcação múltipla.`),
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
    version: 'API',
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

  async getUploads(): Promise<{ endpoint: string; items: AnswerSheet[] }> {
    const uploads = await request<BackendUpload[]>(API_ENDPOINTS.uploads, { method: 'GET' })

    return {
      endpoint: API_ENDPOINTS.uploads,
      items: uploads.map(mapUpload),
    }
  },

  async processUpload(payload: {
    examId: string
    sheetIds: string[]
    templateId?: string
    answerKeyId?: string
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

  async getResults(): Promise<{ endpoint: string; jobs: ProcessingJob[]; omr: OMRResult[]; students: StudentResult[] }> {
    const results = await request<BackendResultsPayload>(API_ENDPOINTS.results, { method: 'GET' })

    return {
      endpoint: API_ENDPOINTS.results,
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

  async getTemplates(): Promise<{ endpoint: string; items: Template[] }> {
    const templates = await request<BackendTemplate[]>(API_ENDPOINTS.templates, { method: 'GET' })

    return {
      endpoint: API_ENDPOINTS.templates,
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

  async getAnswerKeys(): Promise<{ endpoint: string; items: AnswerKey[] }> {
    const answerKeys = await request<BackendAnswerKey[]>(API_ENDPOINTS.answerKeys, { method: 'GET' })

    return {
      endpoint: API_ENDPOINTS.answerKeys,
      items: answerKeys.map(mapAnswerKey),
    }
  },
}
