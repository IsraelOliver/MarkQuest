export type Exam = {
  id: string
  title: string
  subject: string
  totalQuestions: number
  createdAt: string
}

export type BubbleOption = 'A' | 'B' | 'C' | 'D' | 'E'

export type UploadFile = {
  id: string
  originalName: string
  storedName: string
  path: string
  mimeType: string
  size: number
  examId: string
  studentId: string
  createdAt: string
}

export type AnswerSheet = {
  id: string
  examId: string
  studentId: string
  uploadFileId: string
  createdAt: string
}

export type ProcessingJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type ProcessingJob = {
  id: string
  examId: string
  uploadIds: string[]
  templateId: string
  answerKeyId: string
  status: ProcessingJobStatus
  createdAt: string
  finishedAt?: string
}

export type OMRTemplateConfig = {
  totalQuestions: number
  columns: number
  rowsPerColumn: number
  startXRatio: number
  startYRatio: number
  columnGapRatio: number
  rowGapRatio: number
  optionGapRatio: number
  bubbleRadiusRatio: number
  markThreshold: number
  ambiguityThreshold: number
}

export type Template = {
  id: string
  name: string
  examId: string
  totalQuestions: number
  omrConfig: OMRTemplateConfig
  createdAt: string
}

export type AnswerKey = {
  id: string
  name: string
  examId: string
  templateId: string
  answers: BubbleOption[]
  createdAt: string
}

export type OMRResultAnswer = {
  questionNumber: number
  selectedOption: BubbleOption | null
  correctOption: BubbleOption | null
  status: 'correct' | 'incorrect' | 'blank' | 'multiple'
  confidence: number
  fillByOption: Record<BubbleOption, number>
}

export type OMRResult = {
  id: string
  jobId: string
  uploadId: string
  fileName: string
  templateUsedId: string
  answerKeyUsedId: string
  totalQuestions: number
  answers: OMRResultAnswer[]
  blankQuestions: number[]
  multipleMarkedQuestions: number[]
  totalCorrect: number
  totalIncorrect: number
  score: number
  confidenceAverage: number
  metadata: {
    width: number
    height: number
    grayscaleApplied: boolean
    binarizationThreshold: number
    templateName: string
    autoRotationAngle: number
    processedAt: string
  }
}

export type StudentResult = {
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
