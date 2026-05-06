import type { OMRTemplateConfig } from '../../types/entities.js'
import { DEFAULT_SPATIAL_TOLERANCE_PX, getBestBubbleFillRatio, detectMarkedOption } from './bubble-analysis.js'
import { preprocessImage } from './image-preprocessing.js'
import { buildOMRTemplate } from './template-map.js'
import type { OMRDetectionOutput } from './omr.types.js'

const LOW_CONFIDENCE_AVERAGE_THRESHOLD = 0.68
const LOW_CONFIDENCE_BLANK_RATIO_THRESHOLD = 0.5
const LOW_ROTATION_CONFIDENCE_THRESHOLD = 0.05
const LOW_CONFIDENCE_WARNING = 'Leitura OMR com baixa confiança. Revise o cartão processado.'

export async function analyzeAnswerSheetImage(params: {
  imagePath: string
  templateName: string
  templateConfig: OMRTemplateConfig
}): Promise<OMRDetectionOutput> {
  const template = buildOMRTemplate(params.templateName, params.templateConfig)
  const preprocessed = await preprocessImage(params.imagePath)

  const answers: OMRDetectionOutput['answers'] = []
  const blankQuestions: number[] = []
  const multipleMarkedQuestions: number[] = []
  const displacements: number[] = []

  const radius = Math.max(4, Math.round(preprocessed.width * template.bubbleRadiusRatio))
  const spatialTolerancePx = DEFAULT_SPATIAL_TOLERANCE_PX

  for (let questionIndex = 0; questionIndex < template.totalQuestions; questionIndex += 1) {
    const columnIndex = Math.floor(questionIndex / template.rowsPerColumn)
    const rowIndex = questionIndex % template.rowsPerColumn

    const yCenter = Math.round(preprocessed.height * (template.startYRatio + rowIndex * template.rowGapRatio))

    const fillByOption = Object.fromEntries(
      template.options.map((option, optionIndex) => {
        const xCenter = Math.round(
          preprocessed.width *
            (template.startXRatio + columnIndex * template.columnGapRatio + optionIndex * template.optionGapRatio),
        )

        const sampled = getBestBubbleFillRatio(preprocessed.image, xCenter, yCenter, radius, spatialTolerancePx)
        displacements.push(sampled.displacement)
        return [option, sampled.fillRatio]
      }),
    ) as Record<(typeof template.options)[number], number>

    const detection = detectMarkedOption(fillByOption, template.markThreshold, template.ambiguityThreshold)

    const questionNumber = questionIndex + 1
    if (detection.status === 'blank') blankQuestions.push(questionNumber)
    if (detection.status === 'multiple') multipleMarkedQuestions.push(questionNumber)

    answers.push({
      questionNumber,
      selectedOption: detection.selectedOption,
      confidence: detection.confidence,
      fillByOption,
      status: detection.status,
    })
  }

  const displacementAverage =
    displacements.length > 0 ? displacements.reduce((sum, displacement) => sum + displacement, 0) / displacements.length : 0
  const maxDisplacementDetected = displacements.length > 0 ? Math.max(...displacements) : 0
  const confidenceAverage = answers.length > 0 ? answers.reduce((sum, answer) => sum + answer.confidence, 0) / answers.length : 0
  const blankRatio = template.totalQuestions > 0 ? blankQuestions.length / template.totalQuestions : 0
  const rotationAtSearchLimit = Math.abs(preprocessed.autoRotationAngle) === 3
  const weakRotationDecision = (preprocessed.rotationConfidence ?? 0) < LOW_ROTATION_CONFIDENCE_THRESHOLD
  const lowConfidenceWarning =
    confidenceAverage < LOW_CONFIDENCE_AVERAGE_THRESHOLD ||
    blankRatio > LOW_CONFIDENCE_BLANK_RATIO_THRESHOLD ||
    (rotationAtSearchLimit && weakRotationDecision)
      ? LOW_CONFIDENCE_WARNING
      : undefined

  return {
    totalQuestions: template.totalQuestions,
    answers,
    blankQuestions,
    multipleMarkedQuestions,
    metadata: {
      width: preprocessed.width,
      height: preprocessed.height,
      grayscaleApplied: true,
      binarizationThreshold: preprocessed.binarizationThreshold,
      templateName: params.templateName,
      autoRotationAngle: preprocessed.autoRotationAngle,
      rotationCandidates: preprocessed.rotationCandidates,
      rotationConfidence: preprocessed.rotationConfidence,
      lowConfidenceWarning,
      boundingBoxDetected: preprocessed.boundingBoxDetected,
      cropApplied: preprocessed.cropApplied,
      cropFallbackUsed: preprocessed.cropFallbackUsed,
      originalWidth: preprocessed.originalWidth,
      originalHeight: preprocessed.originalHeight,
      processedWidth: preprocessed.processedWidth,
      processedHeight: preprocessed.processedHeight,
      spatialTolerancePx,
      displacementAverage,
      maxDisplacementDetected,
      spatialCorrectionApplied: maxDisplacementDetected > 0,
    },
  }
}
