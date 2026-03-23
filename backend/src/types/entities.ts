export type Unit = {
  id: string
  name: string
  kind: 'school' | 'course' | 'other'
  createdAt: string
}

export type Classroom = {
  id: string
  unitId: string
  name: string
  year: string
  createdAt: string
}

export type Exam = {
  id: string
  classroomId: string
  title: string
  subject: string
  totalQuestions: number
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

export type CardPresetId =
  | 'enem-a4'
  | 'school-a4'
  | 'quiz-20'
  | 'quiz-45'
  | 'quiz-60'
  | 'answer-sheet-4'
  | 'answer-sheet-5'

export type CardTemplateDefinition = {
  pageSize: 'A4'
  totalQuestions: number
  choicesPerQuestion: 4 | 5
  columns: number
  rowsPerColumn: number
  numberingMode: 'continuous' | 'by-block'
  numberingPattern: 'row-column' | 'sequence-column'
  groupByArea: boolean
  showBlockTitles: boolean
  identification: {
    showStudentName: boolean
    showStudentCode: boolean
    showClassroom: boolean
    showDate: boolean
    showExamCode: boolean
    showSignature: boolean
    showManualIdGrid: boolean
    extraFields: string[]
  }
  header: {
    institutionName: string
    examName: string
    subtitle: string
    classroomLabel: string
    instructions: string
    omrGuidance: string
    footerMessage: string
    showInstitutionLogo: boolean
    institutionLogoDataUrl: string
  }
}

export type CardVisualTheme = {
  visualStyle: 'institutional' | 'vestibular' | 'compact'
  density: 'compact' | 'balanced' | 'spacious'
  softBorders: boolean
  showSectionSeparators: boolean
  refinedAlignment: boolean
  highlightHeader: boolean
  answerGridStyle: 'classic' | 'lined' | 'minimal'
}

export type OMRTemplateConfig = {
  totalQuestions: number
  choicesPerQuestion: 4 | 5
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
  presetId: CardPresetId
  definition: CardTemplateDefinition
  visualTheme: CardVisualTheme
  omrConfig: OMRTemplateConfig
  createdAt: string
  updatedAt?: string
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
