export type Exam = {
  id: string
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
  version: string
  answers: string[]
  createdAt: string
}
