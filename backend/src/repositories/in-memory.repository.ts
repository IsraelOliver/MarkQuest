import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env.js'
import type { AnswerKey, Classroom, Exam, OMRResult, ProcessingJob, Student, StudentResult, Template, Unit, UploadFile, User } from '../types/entities.js'

type DbShape = {
  units: Unit[]
  users: User[]
  classrooms: Classroom[]
  exams: Exam[]
  students: Student[]
  uploads: UploadFile[]
  jobs: ProcessingJob[]
  results: OMRResult[]
  studentResults: StudentResult[]
  templates: Template[]
  answerKeys: AnswerKey[]
}

function createInitialState(): DbShape {
  return {
    units: [],
    users: [],
    classrooms: [],
    exams: [],
    students: [],
    uploads: [],
    jobs: [],
    results: [],
    studentResults: [],
    templates: [],
    answerKeys: [],
  }
}

export class JsonRepository {
  private state: DbShape = createInitialState()
  private readonly filePath: string

  constructor() {
    this.filePath = path.resolve(process.cwd(), env.DATA_FILE)
    this.ensureStorage()
    this.load()
  }

  get uploads() {
    return this.state.uploads
  }

  get units() {
    return this.state.units
  }

  get users() {
    return this.state.users
  }

  get classrooms() {
    return this.state.classrooms
  }

  get exams() {
    return this.state.exams
  }

  get students() {
    return this.state.students
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
    const dir = path.dirname(this.filePath)
    const tempPath = path.join(dir, `${path.basename(this.filePath)}.${process.pid}.tmp`)

    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8')
      fs.renameSync(tempPath, this.filePath)
    } catch (error) {
      fs.rmSync(tempPath, { force: true })
      console.error('[JsonRepository] Falha ao persistir arquivo de dados.', {
        filePath: this.filePath,
        error,
      })
      throw error
    }
  }

  private ensureStorage() {
    const dir = path.dirname(this.filePath)
    fs.mkdirSync(dir, { recursive: true })

    if (!fs.existsSync(this.filePath)) {
      this.persist()
    }
  }

  private load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<DbShape>
      this.state = {
        units: parsed.units ?? [],
        users: parsed.users ?? [],
        classrooms: parsed.classrooms ?? [],
        exams: parsed.exams ?? [],
        students: parsed.students ?? [],
        uploads: parsed.uploads ?? [],
        jobs: parsed.jobs ?? [],
        results: parsed.results ?? [],
        studentResults: parsed.studentResults ?? [],
        templates: parsed.templates ?? [],
        answerKeys: parsed.answerKeys ?? [],
      }
    } catch (error) {
      const backupPath = `${this.filePath}.invalid-${Date.now()}`
      console.error('[JsonRepository] Falha ao carregar JSON de dados. Um arquivo limpo será recriado.', {
        filePath: this.filePath,
        backupPath,
        error,
      })

      try {
        if (fs.existsSync(this.filePath)) {
          fs.renameSync(this.filePath, backupPath)
        }
      } catch (backupError) {
        console.error('[JsonRepository] Falha ao preservar cópia do JSON inválido.', {
          filePath: this.filePath,
          backupPath,
          error: backupError,
        })
      }

      this.state = createInitialState()
      this.persist()
    }
  }
}

export const db = new JsonRepository()
