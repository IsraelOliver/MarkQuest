import Jimp from 'jimp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ApiSuccess, TestApp } from './helpers/test-app.js'
import { createTestApp, parseJson } from './helpers/test-app.js'
import { createCoreData, uploadFile, type UploadDto } from './helpers/fixtures.js'

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

    const resultsResponse = await ctx.app.inject({ method: 'GET', url: `/api/results?examId=${exam.id}` })
    expect(resultsResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<ResultsListDto>>(resultsResponse).data).toMatchObject({
      totalProcessedCards: 1,
    })
    expect(parseJson<ApiSuccess<ResultsListDto>>(resultsResponse).data.jobs).toHaveLength(1)
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
  })
})
