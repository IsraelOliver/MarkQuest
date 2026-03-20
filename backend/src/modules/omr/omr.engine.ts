import type { OMRTemplateConfig } from '../../types/entities.js'
import { getBubbleFillRatio, detectMarkedOption } from './bubble-analysis.js'
import { preprocessImage } from './image-preprocessing.js'
import { buildOMRTemplate } from './template-map.js'
import type { OMRDetectionOutput } from './omr.types.js'

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

  const radius = Math.max(4, Math.round(preprocessed.width * template.bubbleRadiusRatio))

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

        const fill = getBubbleFillRatio(preprocessed.image, xCenter, yCenter, radius)
        return [option, fill]
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
    },
  }
}
