export type Unit = {
  id: string
  name: string
  kind: 'school' | 'course' | 'other'
  createdAt: string
}

export type UserRole = 'admin' | 'editor' | 'teacher' | 'viewer'

export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  role: UserRole
  createdAt: string
  updatedAt: string
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

export type OMRUploadProcessingReport = {
  uploadId: string
  fileName: string
  mimeType: string
  status: 'processed' | 'failed'
  processedAt: string
  originalMimeType?: string
  processedMimeType?: string
  originalFileWasPdf?: boolean
  processedPage?: number
  pdfPageCount?: number
  rasterizationDpi?: number
  warning?: string
  width?: number
  height?: number
  autoRotationAngle?: number
  rotationCandidates?: Array<{
    angle: number
    score: number
  }>
  rotationConfidence?: number
  lowConfidenceWarning?: string
  boundingBoxDetected?: boolean
  cropApplied?: boolean
  cropFallbackUsed?: boolean
  originalWidth?: number
  originalHeight?: number
  processedWidth?: number
  processedHeight?: number
  displacementAverage?: number
  maxDisplacementDetected?: number
  spatialCorrectionApplied?: boolean
  confidenceAverage?: number
  blankQuestionsCount?: number
  multipleMarkedQuestionsCount?: number
  error?: {
    name: string
    message: string
  }
}

export type ProcessingJob = {
  id: string
  examId: string
  uploadIds: string[]
  templateId: string
  templateVersion: string
  answerKeyId: string
  answerKeyVersion: string
  status: ProcessingJobStatus
  createdAt: string
  updatedAt: string
  finishedAt?: string
  uploadReports?: OMRUploadProcessingReport[]
}

export type CardPresetId =
  | 'enem-a4'
  | 'school-a4'
  | 'quiz-20'
  | 'quiz-45'
  | 'quiz-60'
  | 'answer-sheet-4'
  | 'answer-sheet-5'

export type CardTemplateSection =
  | {
      id: string
      sectionType: 'objective'
      readMode: 'answers'
      startQuestion: number
      endQuestion: number
      title: string
      choicesPerQuestion: 2 | 3 | 4 | 5
      optionLabels: string[]
      numberingFormat: 'numeric' | 'numericAlpha' | 'alphaNumeric' | 'numericLower' | 'numericDash'
    }
  | {
      id: string
      sectionType: 'open'
      readMode: 'manual'
      label: string
      lines: number
      lineStyle: 'line' | 'box'
      linkedToMainQuestion: boolean
      linkedQuestionNumber: number | null
      markerLabel: string
    }
  | {
      id: string
      sectionType: 'math'
      readMode: 'manual'
        columns: number
        showTopInputRow: boolean
        showColumnHeaders: boolean
        columnHeaders: string[]
        showColumnSeparators: boolean
        separatorMode?: 'none' | 'comma' | 'dot' | 'negative' | 'negative-comma' | 'negative-dot'
        columnSeparators: string[]
        linkedToMainQuestion: boolean
        linkedQuestionNumber: number | null
        markerLabel: string
      }
  | {
      id: string
      sectionType: 'image'
      readMode: 'ignored' | 'manual'
      imageSrc: string | null
      imageName: string | null
      imageWidth?: number | null
      imageHeight?: number | null
      size: 'auto' | '25' | '50' | '75' | '100'
      align: 'left' | 'center' | 'right'
      isQuestion: boolean
      linkedToMainQuestion: boolean
      linkedQuestionNumber: number | null
      markerLabel: string
      mimeType?: string
      fileSize?: number
      optimized?: boolean
      originalName?: string
    }
  | {
      id: string
      sectionType: 'essay'
      readMode: 'manual'
      title: string
      style: 'lines' | 'box'
      lines: number
      highlightStep: number
      showHeader: boolean
      showEssayTitleField: boolean
      showStudentName: boolean
      showClass: boolean
      showTestName: boolean
      showCode: boolean
      showTeacher: boolean
      showShift: boolean
      showDate: boolean
      showLogo: boolean
      logoPosition: 'top-left' | 'top-center' | 'top-right'
      showQRCode: boolean
      qrPosition: 'bottom-right' | 'top-right'
    }
  | {
      id: string
      sectionType: 'label'
      readMode: 'ignored'
      text: string
      align: 'left' | 'center' | 'right'
      size: 'sm' | 'md' | 'lg'
    }
  | {
      id: string
      sectionType: 'spacer'
      readMode: 'ignored'
      size: 'sm' | 'md' | 'lg'
    }
  | {
      id: string
      sectionType: 'pageBreak'
      readMode: 'ignored'
    }
  | {
      id: string
      sectionType: 'signature'
      readMode: 'ignored'
      label: string
      align: 'left' | 'center' | 'right'
      lineWidth: 'sm' | 'md' | 'lg'
    }

export type CardTemplateDefinition = {
  pageSize: 'A4'
  totalQuestions: number
  choicesPerQuestion: 2 | 3 | 4 | 5
  optionLabels: string[]
  columns: number
  rowsPerColumn: number
  questionStyle: 'classic' | 'lined' | 'minimal'
  bubbleSize: 'large' | 'medium' | 'small'
  rowSpacing: 'compact' | 'uniform'
  columnLayoutMode: 'left' | 'distributed'
  columnGap: number
  optionAlignment: 'auto' | 'left' | 'right' | 'center' | 'justify'
  enableQuestionBlocks: boolean
  showQuestionBlockTitles: boolean
  questionBlocks: CardTemplateSection[]
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

export type Template = {
  id: string
  name: string
  examId: string
  totalQuestions: number
  presetId: CardPresetId
  version: string
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
  answers: Array<BubbleOption | null>
  questions?: AnswerKeyQuestion[]
  defaultScore?: number
  defaultWeight?: number
  essayMaxScore?: number
  totalScore?: number
  annulledScoringMode?: AnnulledScoringMode
  createdAt: string
  updatedAt?: string
}

export type AnswerKeyQuestionStatus = 'active' | 'annulled' | 'manual'
export type AnswerKeyQuestionType = 'objective' | 'math' | 'open' | 'image' | 'essay'
export type AnswerKeyQuestionKind = 'ce' | 'ad' | 'ae' | 'math' | 'open' | 'image' | 'essay'
export type AnnulledScoringMode = 'redistribute-group' | 'redistribute-exam' | 'grant-student'

export type AnswerKeyQuestion = {
  questionNumber: number
  questionType: AnswerKeyQuestionType
  questionKind: AnswerKeyQuestionKind
  sourceSectionId: string
  sourceSectionTitle?: string
  markerLabel?: string
  groupKey?: string
  groupLabel?: string
  validOptions: string[]
  correctAnswer: string | null
  allowedCharacters?: string[]
  responseColumns?: number
  score: number
  weight: number
  maxScore?: number
  status: AnswerKeyQuestionStatus
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
    rotationCandidates?: Array<{
      angle: number
      score: number
    }>
    rotationConfidence?: number
    lowConfidenceWarning?: string
    boundingBoxDetected?: boolean
    cropApplied?: boolean
    cropFallbackUsed?: boolean
    originalWidth?: number
    originalHeight?: number
    processedWidth?: number
    processedHeight?: number
    spatialTolerancePx?: number
    displacementAverage?: number
    maxDisplacementDetected?: number
    spatialCorrectionApplied?: boolean
    processedAt: string
  }
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
  multipleAnswers: number
  processedAt: string
  omrResultId: string
}
