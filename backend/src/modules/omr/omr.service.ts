import { db } from '../../repositories/in-memory.repository.js'
import type { OMRResult, ProcessingJob, StudentResult } from '../../types/entities.js'
import { generateId } from '../../utils/id.js'
import { AnswerKeyService } from '../../services/answer-key.service.js'
import { TemplateService } from '../../services/template.service.js'
import { analyzeAnswerSheetImage } from './omr.engine.js'
import { correctAnswers } from '../results/correction.service.js'
import { AppError } from '../../utils/app-error.js'

const templateService = new TemplateService()
const answerKeyService = new AnswerKeyService()

function buildStudentResult(params: {
  examId: string
  uploadId: string
  omrResultId: string
  score: number
  correct: number
  incorrect: number
  blank: number
  multiple: number
}): StudentResult {
  return {
    id: generateId('res'),
    examId: params.examId,
    studentId: `student-${params.uploadId}`,
    score: params.score,
    correctAnswers: params.correct,
    incorrectAnswers: params.incorrect,
    blankAnswers: params.blank,
    multipleAnswers: params.multiple,
    processedAt: new Date().toISOString(),
    omrResultId: params.omrResultId,
  }
}

export class OMRService {
  async process(input: {
    examId: string
    uploadIds: string[]
    templateId?: string
    answerKeyId?: string
  }): Promise<{ job: ProcessingJob; files: OMRResult[] }> {
    const template = input.templateId
      ? templateService.findById(input.templateId)
      : templateService.findLatestByExam(input.examId)

    if (!template) {
      throw new AppError('TEMPLATE_NOT_FOUND', 'Template não encontrado. Crie um template antes do processamento.', 404)
    }

    const answerKey = input.answerKeyId
      ? answerKeyService.findById(input.answerKeyId)
      : answerKeyService.findLatestByExamAndTemplate(input.examId, template.id)

    if (!answerKey) {
      throw new AppError('ANSWER_KEY_NOT_FOUND', 'Gabarito não encontrado. Crie um gabarito para o template selecionado.', 404)
    }

    const job: ProcessingJob = {
      id: generateId('job'),
      examId: input.examId,
      uploadIds: input.uploadIds,
      templateId: template.id,
      answerKeyId: answerKey.id,
      status: 'queued',
      createdAt: new Date().toISOString(),
    }

    db.jobs.push(job)
    db.persist()

    job.status = 'processing'
    db.persist()

    const files: OMRResult[] = []

    for (const uploadId of input.uploadIds) {
      const upload = db.uploads.find((item) => item.id === uploadId)
      if (!upload) continue

      const detection = await analyzeAnswerSheetImage({
        imagePath: upload.path,
        templateName: template.name,
        templateConfig: template.omrConfig,
      })

      const correction = correctAnswers({ detection, answerKey })

      const result: OMRResult = {
        id: generateId('omr'),
        jobId: job.id,
        uploadId: upload.id,
        fileName: upload.originalName,
        templateUsedId: template.id,
        answerKeyUsedId: answerKey.id,
        totalQuestions: detection.totalQuestions,
        answers: correction.answers,
        blankQuestions: detection.blankQuestions,
        multipleMarkedQuestions: detection.multipleMarkedQuestions,
        totalCorrect: correction.totalCorrect,
        totalIncorrect: correction.totalIncorrect,
        score: correction.score,
        confidenceAverage: correction.confidenceAverage,
        metadata: {
          ...detection.metadata,
          processedAt: new Date().toISOString(),
        },
      }

      files.push(result)
      db.results.push(result)

      db.studentResults.push(
        buildStudentResult({
          examId: input.examId,
          uploadId,
          omrResultId: result.id,
          score: result.score,
          correct: result.totalCorrect,
          incorrect: result.totalIncorrect,
          blank: result.blankQuestions.length,
          multiple: result.multipleMarkedQuestions.length,
        }),
      )

      db.persist()
    }

    job.status = files.length > 0 ? 'completed' : 'failed'
    job.finishedAt = new Date().toISOString()
    db.persist()

    return { job, files }
  }
}
