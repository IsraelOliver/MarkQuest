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
  templateId: string
  templateVersion: string
  answerKeyId: string
  answerKeyVersion: string
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
export type CardNumberingFormat = 'numeric' | 'numericAlpha' | 'alphaNumeric' | 'numericLower' | 'numericDash'
export type CardBubbleSize = 'large' | 'medium' | 'small'
export type CardRowSpacing = 'compact' | 'uniform'
export type CardOptionAlignment = 'auto' | 'left' | 'right' | 'center' | 'justify'
export type CardColumnLayoutMode = 'left' | 'distributed'
export type CardVisualStyle = 'institutional' | 'vestibular' | 'compact'
export type CardVisualDensity = 'compact' | 'balanced' | 'spacious'
export type CardQuestionStyle = 'classic' | 'lined' | 'minimal'
export type OMRReadMode = 'conservative' | 'balanced' | 'sensitive'
export type CardQuestionBlock = {
  startQuestion: number
  endQuestion: number
  title: string
  choicesPerQuestion: 2 | 3 | 4 | 5
  optionLabels: string[]
  questionStyle: CardQuestionStyle
}

export type CardTemplateDefinition = {
  pageSize: CardPageSize
  totalQuestions: number
  choicesPerQuestion: 2 | 3 | 4 | 5
  optionLabels: string[]
  columns: number
  rowsPerColumn: number
  numberingFormat: CardNumberingFormat
  bubbleSize: CardBubbleSize
  rowSpacing: CardRowSpacing
  columnLayoutMode: CardColumnLayoutMode
  columnGap: number
  optionAlignment: CardOptionAlignment
  enableQuestionBlocks: boolean
  showQuestionBlockTitles: boolean
  questionBlocks: CardQuestionBlock[]
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
    showInstructions: boolean
    omrGuidance: string
    footerMessage: string
    footerMessageAlignment: 'left' | 'center' | 'right'
    footerMessageWeight: 'regular' | 'semibold'
    footerMessageFontSize: number
    footerPagePosition: 'top' | 'bottom'
    footerPageTone: 'subtle' | 'standard'
    showInstitutionLogo: boolean
    institutionLogoDataUrl: string
    logoAlignment: 'left' | 'center' | 'right'
    logoScale: number
    logoMonochrome: boolean
  }
}

export type CardVisualTheme = {
  visualStyle: CardVisualStyle
  density: CardVisualDensity
  softBorders: boolean
  showSectionSeparators: boolean
  refinedAlignment: boolean
  highlightHeader: boolean
  answerGridStyle: CardQuestionStyle
}

export type OMRTemplateConfig = {
  totalQuestions: number
  choicesPerQuestion: 2 | 3 | 4 | 5
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
  templateId: string
  version: string
  answers: string[]
  createdAt: string
}
