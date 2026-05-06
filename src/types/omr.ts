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
  sheetIds: string[]
  templateId: string
  templateVersion: string
  answerKeyId: string
  answerKeyVersion: string
  status: ProcessingJobStatus
  createdAt: string
  updatedAt?: string
  finishedAt?: string
  totalFiles?: number
  processedFiles?: number
  failedFiles?: number
  uploadReports?: OMRUploadProcessingReport[]
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
export type CardTemplateSectionType = 'objective' | 'mathematics' | 'math' | 'open' | 'image' | 'label' | 'spacer' | 'pageBreak' | 'signature' | 'essay'
export type CardTemplateSectionReadMode = 'answers' | 'ignored' | 'manual'
export type CardLabelAlign = 'left' | 'center' | 'right'
export type CardLabelSize = 'sm' | 'md' | 'lg'
export type CardSpacerSize = 'sm' | 'md' | 'lg'
export type CardSignatureAlign = 'left' | 'center' | 'right'
export type CardSignatureLineWidth = 'sm' | 'md' | 'lg'
export type CardOpenLineStyle = 'line' | 'box'
export type CardEssayStyle = 'lines' | 'box'
export type CardEssayLogoPosition = 'top-left' | 'top-center' | 'top-right'
export type CardEssayQrPosition = 'bottom-right' | 'top-right'
export type CardImageSize = 'auto' | '25' | '50' | '75' | '100'
export type CardImageAlign = 'left' | 'center' | 'right'

export type CardObjectiveSection = {
  id: string
  sectionType: 'objective'
  readMode: 'answers'
  startQuestion: number
  endQuestion: number
  title: string
  choicesPerQuestion: 2 | 3 | 4 | 5
  optionLabels: string[]
  numberingFormat: CardNumberingFormat
}

export type CardLabelSection = {
  id: string
  sectionType: 'label'
  readMode: 'ignored'
  text: string
  align: CardLabelAlign
  size: CardLabelSize
}

export type CardSpacerSection = {
  id: string
  sectionType: 'spacer'
  readMode: 'ignored'
  size: CardSpacerSize
}

export type CardPageBreakSection = {
  id: string
  sectionType: 'pageBreak'
  readMode: 'ignored'
}

export type CardSignatureSection = {
  id: string
  sectionType: 'signature'
  readMode: 'ignored'
  label: string
  align: CardSignatureAlign
  lineWidth: CardSignatureLineWidth
}

export type CardOpenSection = {
  id: string
  sectionType: 'open'
  readMode: 'manual'
  label: string
  lines: number
  lineStyle: CardOpenLineStyle
  linkedToMainQuestion: boolean
  linkedQuestionNumber: number | null
  markerLabel: string
}

export type CardMathSection = {
  id: string
  sectionType: 'math'
  readMode: 'manual'
  columns: number
  showTopInputRow: boolean
  showColumnHeaders: boolean
  columnHeaders: string[]
  showColumnSeparators: boolean
  separatorMode: 'none' | 'comma' | 'dot' | 'negative' | 'negative-comma' | 'negative-dot'
  columnSeparators: string[]
  linkedToMainQuestion: boolean
  linkedQuestionNumber: number | null
  markerLabel: string
}

export type CardImageSection = {
  id: string
  sectionType: 'image'
  readMode: 'ignored' | 'manual'
  imageSrc: string | null
  imageName: string | null
  imageWidth: number | null
  imageHeight: number | null
  size: CardImageSize
  align: CardImageAlign
  isQuestion: boolean
  linkedToMainQuestion: boolean
  linkedQuestionNumber: number | null
  markerLabel: string
  mimeType?: string
  fileSize?: number
  optimized?: boolean
  originalName?: string
}

export type CardEssaySection = {
  id: string
  sectionType: 'essay'
  readMode: 'manual'
  title: string
  style: CardEssayStyle
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
  logoPosition: CardEssayLogoPosition
  showQRCode: boolean
  qrPosition: CardEssayQrPosition
}

export type CardTemplateSection =
  | CardObjectiveSection
  | CardOpenSection
  | CardMathSection
  | CardImageSection
  | CardEssaySection
  | CardLabelSection
  | CardSpacerSection
  | CardPageBreakSection
  | CardSignatureSection
export type CardQuestionBlock = CardTemplateSection

export type CardTemplateDefinition = {
  pageSize: CardPageSize
  totalQuestions: number
  choicesPerQuestion: 2 | 3 | 4 | 5
  optionLabels: string[]
  columns: number
  rowsPerColumn: number
  questionStyle: CardQuestionStyle
  bubbleSize: CardBubbleSize
  rowSpacing: CardRowSpacing
  columnLayoutMode: CardColumnLayoutMode
  columnGap: number
  optionAlignment: CardOptionAlignment
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

export type AnswerKey = {
  id: string
  name: string
  examId: string
  templateId: string
  version: string
  answers: Array<string | null>
  questions?: AnswerKeyQuestion[]
  defaultScore?: number
  defaultWeight?: number
  essayMaxScore?: number
  totalScore?: number
  annulledScoringMode?: AnnulledScoringMode
  createdAt: string
  updatedAt?: string
}
