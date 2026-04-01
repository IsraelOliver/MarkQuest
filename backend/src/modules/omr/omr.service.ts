import { correctAnswers } from '../results/correction.service.js'
import { AnswerKeyService } from '../../services/answer-key.service.js'
import { TemplateService } from '../../services/template.service.js'
import { db } from '../../repositories/in-memory.repository.js'
import type { OMRResult, ProcessingJob, StudentResult, UploadFile } from '../../types/entities.js'
import { AppError } from '../../utils/app-error.js'
import { generateId } from '../../utils/id.js'
import { analyzeAnswerSheetImage } from './omr.engine.js'

const templateService = new TemplateService()
const answerKeyService = new AnswerKeyService()

function getStudentName(studentId: string) {
  const student = db.students.find((item) => item.id === studentId)
  if (!student) return 'Aluno sem identificacao'
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
}

function buildStudentResult(params: {
  examId: string
  upload: UploadFile
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
    studentId: params.upload.studentId,
    studentName: getStudentName(params.upload.studentId),
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
    templateId: string
    answerKeyId: string
  }): Promise<{ job: ProcessingJob; files: OMRResult[] }> {
    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova nao encontrada para processamento.', 404)
    }

    const template = templateService.findById(input.templateId)
    if (!template) {
      throw new AppError('TEMPLATE_NOT_FOUND', 'Template nao encontrado. Crie um template antes do processamento.', 404)
    }

    if (template.examId !== input.examId) {
      throw new AppError('PROCESS_TEMPLATE_EXAM_MISMATCH', 'O template selecionado nao pertence a prova ativa.', 400)
    }

    const answerKey = answerKeyService.findById(input.answerKeyId)
    if (!answerKey) {
      throw new AppError('ANSWER_KEY_NOT_FOUND', 'Gabarito nao encontrado. Crie um gabarito para o template selecionado.', 404)
    }

    if (answerKey.examId !== input.examId) {
      throw new AppError('PROCESS_ANSWER_KEY_EXAM_MISMATCH', 'O gabarito selecionado nao pertence a prova ativa.', 400)
    }

    if (answerKey.templateId !== template.id) {
      throw new AppError('PROCESS_ANSWER_KEY_TEMPLATE_MISMATCH', 'O gabarito selecionado nao corresponde ao template informado.', 400)
    }

    const uploads = input.uploadIds.map((uploadId) => {
      const upload = db.uploads.find((item) => item.id === uploadId)
      if (!upload) {
        throw new AppError('UPLOAD_NOT_FOUND', `Upload ${uploadId} nao encontrado.`, 404)
      }

      if (upload.examId !== input.examId) {
        throw new AppError('PROCESS_UPLOAD_EXAM_MISMATCH', 'Todos os uploads precisam pertencer a prova ativa.', 400)
      }

      return upload
    })

    const job: ProcessingJob = {
      id: generateId('job'),
      examId: input.examId,
      uploadIds: input.uploadIds,
      templateId: template.id,
      templateVersion: template.version ?? 'v1',
      answerKeyId: answerKey.id,
      answerKeyVersion: answerKey.name,
      status: 'queued',
      createdAt: new Date().toISOString(),
    }

    db.jobs.push(job)
    db.persist()

    job.status = 'processing'
    db.persist()

    const files: OMRResult[] = []

    for (const upload of uploads) {
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
          templateName: `${template.name} (${template.version ?? 'v1'})`,
          processedAt: new Date().toISOString(),
        },
      }

      files.push(result)
      db.results.push(result)
      db.studentResults.push(
        buildStudentResult({
          examId: input.examId,
          upload,
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
