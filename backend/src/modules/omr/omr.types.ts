import type { BubbleOption } from '../../types/entities.js'

export type QuestionDetection = {
  questionNumber: number
  selectedOption: BubbleOption | null
  confidence: number
  fillByOption: Record<BubbleOption, number>
  status: 'marked' | 'blank' | 'multiple'
}

export type OMRTemplate = {
  totalQuestions: number
  options: BubbleOption[]
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

export type OMRProcessingMetadata = {
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
}

export type OMRDetectionOutput = {
  totalQuestions: number
  answers: QuestionDetection[]
  blankQuestions: number[]
  multipleMarkedQuestions: number[]
  metadata: OMRProcessingMetadata
}
