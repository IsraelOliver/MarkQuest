import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import { vi } from 'vitest'

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: Record<string, unknown>
}

export type ApiFailure = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type TestApp = {
  app: FastifyInstance
  rootDir: string
  dataFile: string
  uploadDir: string
  cleanup: () => Promise<void>
}

type CreateTestAppOptions = {
  mockOmr?: boolean
}

export function parseJson<T>(response: LightMyRequestResponse): T {
  return JSON.parse(response.payload) as T
}

export async function createTestApp(options: CreateTestAppOptions = {}): Promise<TestApp> {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'markquest-api-test-'))
  const dataFile = path.join(rootDir, 'data', 'markquest-db.json')
  const uploadDir = path.join(rootDir, 'uploads')

  process.env.NODE_ENV = 'test'
  process.env.DATA_FILE = dataFile
  process.env.UPLOAD_DIR = uploadDir
  process.env.PORT = '0'
  process.env.HOST = '127.0.0.1'

  vi.resetModules()
  vi.clearAllMocks()
  vi.doUnmock('../../src/modules/omr/omr.engine.js')

  if (options.mockOmr) {
    vi.doMock('../../src/modules/omr/omr.engine.js', () => ({
      analyzeAnswerSheetImage: vi.fn().mockResolvedValue({
        totalQuestions: 2,
        answers: [
          {
            questionNumber: 1,
            selectedOption: 'A',
            confidence: 0.98,
            fillByOption: { A: 0.9, B: 0.02, C: 0.01, D: 0.01, E: 0.01 },
            status: 'marked',
          },
          {
            questionNumber: 2,
            selectedOption: null,
            confidence: 0,
            fillByOption: { A: 0.01, B: 0.01, C: 0.01, D: 0.01, E: 0.01 },
            status: 'blank',
          },
        ],
        blankQuestions: [2],
        multipleMarkedQuestions: [],
        metadata: {
          width: 100,
          height: 100,
          grayscaleApplied: true,
          binarizationThreshold: 128,
          templateName: 'Mock template',
          autoRotationAngle: 0,
        },
      }),
    }))
  }

  const { createApp } = await import('../../src/app/create-app.js')
  const app = createApp()
  await app.ready()

  return {
    app,
    rootDir,
    dataFile,
    uploadDir,
    cleanup: async () => {
      await app.close()
      fs.rmSync(rootDir, { recursive: true, force: true })
      vi.doUnmock('../../src/modules/omr/omr.engine.js')
    },
  }
}

export function buildMultipartPayload(params: {
  fields: Record<string, string>
  file: {
    fieldName?: string
    filename: string
    contentType: string
    content: Buffer | string
  }
}) {
  const boundary = `----markquest-test-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const chunks: Buffer[] = []
  const push = (value: string | Buffer) => chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value))

  for (const [name, value] of Object.entries(params.fields)) {
    push(`--${boundary}\r\n`)
    push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`)
    push(`${value}\r\n`)
  }

  push(`--${boundary}\r\n`)
  push(
    `Content-Disposition: form-data; name="${params.file.fieldName ?? 'file'}"; filename="${params.file.filename}"\r\n`,
  )
  push(`Content-Type: ${params.file.contentType}\r\n\r\n`)
  push(params.file.content)
  push('\r\n')
  push(`--${boundary}--\r\n`)

  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(Buffer.concat(chunks).length),
    },
    payload: Buffer.concat(chunks),
  }
}
