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

export type CardPresetId =
  | 'enem-a4'
  | 'school-a4'
  | 'quiz-20'
  | 'quiz-45'
  | 'quiz-60'
  | 'answer-sheet-4'
  | 'answer-sheet-5'

export type CardPageSize = 'A4'
export type CardNumberingMode = 'continuous' | 'by-block'
export type CardNumberingPattern = 'row-column' | 'sequence-column'
export type CardVisualStyle = 'institutional' | 'vestibular' | 'compact'
export type CardVisualDensity = 'compact' | 'balanced' | 'spacious'
export type OMRReadMode = 'conservative' | 'balanced' | 'sensitive'

export type CardTemplateDefinition = {
  pageSize: CardPageSize
  totalQuestions: number
  choicesPerQuestion: 4 | 5
  columns: number
  rowsPerColumn: number
  numberingMode: CardNumberingMode
  numberingPattern: CardNumberingPattern
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
  visualStyle: CardVisualStyle
  density: CardVisualDensity
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

export type CardTemplateValidationIssue = {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
  field?: string
}

export type CardTemplateEditorState = {
  name: string
  presetId: CardPresetId
  definition: CardTemplateDefinition
  visualTheme: CardVisualTheme
  omrConfig: OMRTemplateConfig
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
  version: string
  createdAt: string
  updatedAt?: string
}

export type AnswerKey = {
  id: string
  examId: string
  templateId?: string
  version: string
  answers: string[]
  createdAt: string
}
