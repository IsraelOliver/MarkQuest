import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env.js'
import type { AnswerKey, OMRResult, ProcessingJob, StudentResult, Template, UploadFile } from '../types/entities.js'

type DbShape = {
  uploads: UploadFile[]
  jobs: ProcessingJob[]
  results: OMRResult[]
  studentResults: StudentResult[]
  templates: Template[]
  answerKeys: AnswerKey[]
}

const initialState: DbShape = {
  uploads: [],
  jobs: [],
  results: [],
  studentResults: [],
  templates: [],
  answerKeys: [],
}

export class JsonRepository {
  private state: DbShape = initialState
  private readonly filePath: string

  constructor() {
    this.filePath = path.resolve(process.cwd(), env.DATA_FILE)
    this.ensureStorage()
    this.load()
  }

  get uploads() {
    return this.state.uploads
  }

  get jobs() {
    return this.state.jobs
  }

  get results() {
    return this.state.results
  }

  get studentResults() {
    return this.state.studentResults
  }

  get templates() {
    return this.state.templates
  }

  get answerKeys() {
    return this.state.answerKeys
  }

  persist() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8')
  }

  private ensureStorage() {
    const dir = path.dirname(this.filePath)
    fs.mkdirSync(dir, { recursive: true })

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(initialState, null, 2), 'utf-8')
    }
  }

  private load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<DbShape>
      this.state = {
        uploads: parsed.uploads ?? [],
        jobs: parsed.jobs ?? [],
        results: parsed.results ?? [],
        studentResults: parsed.studentResults ?? [],
        templates: parsed.templates ?? [],
        answerKeys: parsed.answerKeys ?? [],
      }
    } catch {
      this.state = { ...initialState }
      this.persist()
    }
  }
}

export const db = new JsonRepository()
