import fs from 'node:fs'
import Jimp from 'jimp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ApiSuccess, TestApp } from './helpers/test-app.js'
import { createTestApp, parseJson } from './helpers/test-app.js'
import { buildTemplatePayload, createClassroom, createCoreData, createStudent, createUnit, uploadFile, type ExamDto, type TemplateDto, type UploadDto } from './helpers/fixtures.js'

type ProcessingJobDto = {
  id: string
  examId: string
  uploadIds: string[]
  templateId: string
  templateVersion: string
  answerKeyId: string
  answerKeyVersion: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
  finishedAt?: string
  totalFiles: number
  processedFiles: number
  failedFiles: number
  uploadReports?: Array<{
    uploadId: string
    fileName: string
    mimeType: string
    status: 'processed' | 'failed'
    processedAt: string
    width?: number
    height?: number
    autoRotationAngle?: number
    rotationCandidates?: Array<{
      angle: number
      score: number
    }>
    rotationConfidence?: number
    lowConfidenceWarning?: string
    boundingBoxDetected?: boolean
    cropApplied?: boolean
    cropFallbackUsed?: boolean
    originalWidth?: number
    originalHeight?: number
    processedWidth?: number
    processedHeight?: number
    displacementAverage?: number
    maxDisplacementDetected?: number
    spatialCorrectionApplied?: boolean
    confidenceAverage?: number
    blankQuestionsCount?: number
    multipleMarkedQuestionsCount?: number
    error?: {
      name: string
      message: string
    }
    originalMimeType?: string
    processedMimeType?: string
    originalFileWasPdf?: boolean
    processedPage?: number
    pdfPageCount?: number
    rasterizationDpi?: number
    warning?: string
  }>
  results: Array<{
    id: string
    jobId: string
    uploadId: string
    totalQuestions: number
    totalCorrect: number
    totalIncorrect: number
    score: number
    blankQuestions: number[]
    multipleMarkedQuestions: number[]
    answers: Array<{
      questionNumber: number
      selectedOption: string | null
      correctOption: string | null
      status: 'correct' | 'incorrect' | 'blank' | 'multiple'
      confidence: number
    }>
  }>
}

type ResultsListDto = {
  jobs: ProcessingJobDto[]
  omrResults: unknown[]
  studentResults: unknown[]
  totalProcessedCards: number
}

describe('OMR processing contract with mocked engine', () => {
  let ctx: TestApp

  beforeEach(async () => {
    ctx = await createTestApp({ mockOmr: true })
  })

  afterEach(async () => {
    await ctx.cleanup()
  })

  it('returns a complete ProcessingJob shape and persisted results', async () => {
    const { exam, student, template, answerKey } = await createCoreData(ctx.app)
    const uploadResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'cartao.png',
      contentType: 'image/png',
      content: Buffer.from('mocked-engine-does-not-read-this-file'),
    })
    const upload = parseJson<ApiSuccess<UploadDto>>(uploadResponse).data

    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/omr/process',
      payload: {
        examId: exam.id,
        uploadIds: [upload.id],
        templateId: template.id,
        answerKeyId: answerKey.id,
      },
    })

    expect(response.statusCode).toBe(202)
    const job = parseJson<ApiSuccess<ProcessingJobDto>>(response).data

    expect(job).toMatchObject({
      examId: exam.id,
      uploadIds: [upload.id],
      templateId: template.id,
      templateVersion: template.version,
      answerKeyId: answerKey.id,
      answerKeyVersion: answerKey.name,
      status: 'completed',
      totalFiles: 1,
      processedFiles: 1,
      failedFiles: 0,
    })
    expect(job.id).toMatch(/^job_/)
    expect(job.createdAt).toEqual(expect.any(String))
    expect(job.updatedAt).toEqual(expect.any(String))
    expect(job.finishedAt).toEqual(expect.any(String))
    expect(job.results).toHaveLength(1)
    expect(job.results[0]).toMatchObject({
      uploadId: upload.id,
      totalQuestions: 2,
      totalCorrect: 1,
      totalIncorrect: 1,
      score: 50,
      blankQuestions: [2],
      multipleMarkedQuestions: [],
    })
    expect(job.results[0].answers.map((answer) => answer.status)).toEqual(['correct', 'blank'])
    expect(job.uploadReports).toEqual([
      expect.objectContaining({
        uploadId: upload.id,
        fileName: 'cartao.png',
        mimeType: 'image/png',
        status: 'processed',
        width: 100,
        height: 100,
        autoRotationAngle: 0,
        rotationCandidates: [
          { angle: 0, score: 1000 },
          { angle: -1, score: 900 },
        ],
        rotationConfidence: 0.1,
        boundingBoxDetected: true,
        cropApplied: false,
        cropFallbackUsed: false,
        originalWidth: 100,
        originalHeight: 100,
        processedWidth: 100,
        processedHeight: 100,
        displacementAverage: 1.25,
        maxDisplacementDetected: 2,
        spatialCorrectionApplied: true,
        confidenceAverage: 0.49,
        blankQuestionsCount: 1,
        multipleMarkedQuestionsCount: 0,
        processedAt: expect.any(String),
      }),
    ])

    const resultsResponse = await ctx.app.inject({ method: 'GET', url: `/api/results?examId=${exam.id}` })
    expect(resultsResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<ResultsListDto>>(resultsResponse).data).toMatchObject({
      totalProcessedCards: 1,
    })
    expect(parseJson<ApiSuccess<ResultsListDto>>(resultsResponse).data.jobs).toHaveLength(1)
    expect(parseJson<ApiSuccess<ResultsListDto>>(resultsResponse).data.jobs[0].uploadReports).toHaveLength(1)
    expect(parseJson<ApiSuccess<ResultsListDto>>(resultsResponse).data.omrResults).toHaveLength(1)
  })
})

describe('OMR processing smoke test with real engine', () => {
  let ctx: TestApp

  beforeEach(async () => {
    ctx = await createTestApp()
  })

  afterEach(async () => {
    await ctx.cleanup()
  })

  it('processes a small valid PNG without breaking the job contract', async () => {
    const { exam, student, template, answerKey } = await createCoreData(ctx.app)
    const image = await new Jimp(240, 240, 0xffffffff)
    const png = await image.getBufferAsync(Jimp.MIME_PNG)

    const uploadResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'blank-card.png',
      contentType: 'image/png',
      content: png,
    })
    expect(uploadResponse.statusCode).toBe(201)
    const upload = parseJson<ApiSuccess<UploadDto>>(uploadResponse).data

    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/omr/process',
      payload: {
        examId: exam.id,
        uploadIds: [upload.id],
        templateId: template.id,
        answerKeyId: answerKey.id,
      },
    })

    expect(response.statusCode).toBe(202)
    const job = parseJson<ApiSuccess<ProcessingJobDto>>(response).data
    expect(job.id).toMatch(/^job_/)
    expect(job.totalFiles).toBe(1)
    expect(job.processedFiles + job.failedFiles).toBe(1)
    expect(job.results.length).toBe(job.processedFiles)
    expect(job.uploadReports).toHaveLength(1)
    expect(job.uploadReports?.[0]).toMatchObject({
      uploadId: upload.id,
      fileName: 'blank-card.png',
      mimeType: 'image/png',
      processedAt: expect.any(String),
    })
  })

  it('persists technical failure details for an unreadable uploaded file', async () => {
    const { exam, student, template, answerKey } = await createCoreData(ctx.app)
    const uploadResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'cartao.pdf',
      contentType: 'application/pdf',
      content: Buffer.from('%PDF-1.4\n% unreadable test fixture\n'),
    })
    expect(uploadResponse.statusCode).toBe(201)
    const upload = parseJson<ApiSuccess<UploadDto>>(uploadResponse).data

    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/omr/process',
      payload: {
        examId: exam.id,
        uploadIds: [upload.id],
        templateId: template.id,
        answerKeyId: answerKey.id,
      },
    })

    expect(response.statusCode).toBe(202)
    const job = parseJson<ApiSuccess<ProcessingJobDto>>(response).data
    expect(job).toMatchObject({
      status: 'failed',
      totalFiles: 1,
      processedFiles: 0,
      failedFiles: 1,
      results: [],
    })
    expect(job.uploadReports).toEqual([
      expect.objectContaining({
        uploadId: upload.id,
        fileName: 'cartao.pdf',
        mimeType: 'application/pdf',
        status: 'failed',
        originalMimeType: 'application/pdf',
        originalFileWasPdf: true,
        processedAt: expect.any(String),
        error: expect.objectContaining({
          name: expect.any(String),
          message: expect.stringContaining('rasterizar o PDF'),
        }),
      }),
    ])
  })

  it('rasterizes a controlled one-page PDF before real OMR reading', async () => {
    const unit = await createUnit(ctx.app)
    const classroom = await createClassroom(ctx.app, unit.id)
    const examResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: { classroomId: classroom.id, title: 'Simulado PDF OMR', subject: 'OMR', totalQuestions: 10 },
    })
    const exam = parseJson<ApiSuccess<ExamDto>>(examResponse).data
    const student = await createStudent(ctx.app, classroom.id)

    const templatePayload = buildTemplatePayload({ examId: exam.id, totalQuestions: 10 })
    const templateResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: {
        ...templatePayload,
        omrConfig: {
          ...templatePayload.omrConfig,
          startXRatio: 0.25,
          startYRatio: 0.18,
          columnGapRatio: 0,
          rowGapRatio: 0.065,
          optionGapRatio: 0.065,
          bubbleRadiusRatio: 0.022,
          markThreshold: 0.25,
          ambiguityThreshold: 0.15,
        },
      },
    })
    const template = parseJson<ApiSuccess<TemplateDto>>(templateResponse).data

    const answerKeyResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/answer-keys',
      payload: {
        name: 'Gabarito PDF controlado',
        examId: exam.id,
        templateId: template.id,
        answers: ['A', 'C', 'D', 'A', 'B', 'D', 'E', 'A', 'B', 'C'],
      },
    })
    const answerKey = parseJson<ApiSuccess<{ id: string }>>(answerKeyResponse).data

    const pdf = fs.readFileSync('test/fixtures/omr-10q-controlled.pdf')
    const uploadResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'omr-10q-controlled.pdf',
      contentType: 'application/pdf',
      content: pdf,
    })
    expect(uploadResponse.statusCode).toBe(201)
    const upload = parseJson<ApiSuccess<UploadDto>>(uploadResponse).data

    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/omr/process',
      payload: {
        examId: exam.id,
        uploadIds: [upload.id],
        templateId: template.id,
        answerKeyId: answerKey.id,
      },
    })

    expect(response.statusCode).toBe(202)
    const job = parseJson<ApiSuccess<ProcessingJobDto>>(response).data
    expect(job).toMatchObject({
      status: 'completed',
      totalFiles: 1,
      processedFiles: 1,
      failedFiles: 0,
    })
    expect(job.results[0]).toMatchObject({
      totalQuestions: 10,
      totalCorrect: 6,
      totalIncorrect: 4,
      score: 60,
      blankQuestions: [4, 9],
      multipleMarkedQuestions: [7],
    })
    expect(job.results[0].answers.map((answer) => answer.selectedOption)).toEqual([
      'A',
      'C',
      'E',
      null,
      'B',
      'D',
      null,
      'A',
      null,
      'C',
    ])
    expect(job.uploadReports).toEqual([
      expect.objectContaining({
        uploadId: upload.id,
        fileName: 'omr-10q-controlled.pdf',
        mimeType: 'application/pdf',
        originalMimeType: 'application/pdf',
        processedMimeType: 'image/png',
        originalFileWasPdf: true,
        processedPage: 1,
        pdfPageCount: 1,
        rasterizationDpi: 144,
        status: 'processed',
        confidenceAverage: expect.any(Number),
        blankQuestionsCount: 2,
        multipleMarkedQuestionsCount: 1,
      }),
    ])
  }, 30_000)

  it('processes the first page of a multi-page PDF and records a warning', async () => {
    const unit = await createUnit(ctx.app)
    const classroom = await createClassroom(ctx.app, unit.id)
    const examResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: { classroomId: classroom.id, title: 'Simulado PDF multipagina', subject: 'OMR', totalQuestions: 10 },
    })
    const exam = parseJson<ApiSuccess<ExamDto>>(examResponse).data
    const student = await createStudent(ctx.app, classroom.id)

    const templatePayload = buildTemplatePayload({ examId: exam.id, totalQuestions: 10 })
    const templateResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: {
        ...templatePayload,
        omrConfig: {
          ...templatePayload.omrConfig,
          startXRatio: 0.25,
          startYRatio: 0.18,
          columnGapRatio: 0,
          rowGapRatio: 0.065,
          optionGapRatio: 0.065,
          bubbleRadiusRatio: 0.022,
          markThreshold: 0.25,
          ambiguityThreshold: 0.15,
        },
      },
    })
    const template = parseJson<ApiSuccess<TemplateDto>>(templateResponse).data

    const answerKeyResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/answer-keys',
      payload: {
        name: 'Gabarito PDF multipagina',
        examId: exam.id,
        templateId: template.id,
        answers: ['A', 'C', 'D', 'A', 'B', 'D', 'E', 'A', 'B', 'C'],
      },
    })
    const answerKey = parseJson<ApiSuccess<{ id: string }>>(answerKeyResponse).data

    const pdf = fs.readFileSync('test/fixtures/omr-10q-controlled-2pages.pdf')
    const uploadResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'omr-10q-controlled-2pages.pdf',
      contentType: 'application/pdf',
      content: pdf,
    })
    expect(uploadResponse.statusCode).toBe(201)
    const upload = parseJson<ApiSuccess<UploadDto>>(uploadResponse).data

    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/omr/process',
      payload: {
        examId: exam.id,
        uploadIds: [upload.id],
        templateId: template.id,
        answerKeyId: answerKey.id,
      },
    })

    expect(response.statusCode).toBe(202)
    const job = parseJson<ApiSuccess<ProcessingJobDto>>(response).data
    expect(job).toMatchObject({
      status: 'completed',
      totalFiles: 1,
      processedFiles: 1,
      failedFiles: 0,
    })
    expect(job.results[0]).toMatchObject({
      totalQuestions: 10,
      totalCorrect: 6,
      totalIncorrect: 4,
      score: 60,
      blankQuestions: [4, 9],
      multipleMarkedQuestions: [7],
    })
    expect(job.results[0].answers.map((answer) => answer.selectedOption)).toEqual([
      'A',
      'C',
      'E',
      null,
      'B',
      'D',
      null,
      'A',
      null,
      'C',
    ])
    expect(job.uploadReports?.[0]).toMatchObject({
      uploadId: upload.id,
      fileName: 'omr-10q-controlled-2pages.pdf',
      processedMimeType: 'image/png',
      originalFileWasPdf: true,
      processedPage: 1,
      pdfPageCount: 2,
      rasterizationDpi: 144,
      warning: 'PDF com múltiplas páginas: apenas a primeira página foi processada.',
      status: 'processed',
    })
  }, 30_000)
})
