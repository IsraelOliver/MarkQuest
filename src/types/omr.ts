export type UnitKind = 'school' | 'course' | 'other'

export type Unit = {
  id: string
  name: string
  kind: UnitKind
  createdAt: string
}

export type Classroom = {
  id: string
  unitId: string
  name: string
  year: string
  createdAt: string
}

export type Student = {
  id: string
  classroomId: string
  firstName: string
  middleName: string
  lastName: string
  studentCode: string
  createdAt: string
}

export type Exam = {
  id: string
  classroomId: string
  name: string
  subject: string
  totalQuestions: number
  createdAt: string
}

export type AnswerSheet = {
  id: string
  studentId: string
  studentName: string
  examId: string
  fileName: string
  uploadedAt: string
}

export type ProcessingJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type ProcessingJob = {
  id: string
  examId: string
  sheetIds: string[]
  status: ProcessingJobStatus
  createdAt: string
  finishedAt?: string
}

export type OMRResult = {
  id: string
  jobId: string
  answerSheetId: string
  confidence: number
  detectedAnswers: string[]
  warnings: string[]
}

export type StudentResult = {
  id: string
  examId: string
  studentId: string
  studentName: string
  score: number
  correctAnswers: number
  incorrectAnswers: number
  blankAnswers: number
}

export type Template = {
  id: string
  name: string
  examId: string
  totalQuestions: number
  version: string
  createdAt: string
}

export type AnswerKey = {
  id: string
  examId: string
  templateId?: string
  version: string
  answers: string[]
  createdAt: string
}
