import type { OMRTemplateConfig } from '../../types/entities.js'
import type { OMRTemplate } from './omr.types.js'

const OMR_OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const

export const DEFAULT_TEMPLATE_CONFIG_20Q: OMRTemplateConfig = {
  totalQuestions: 20,
  choicesPerQuestion: 5,
  columns: 2,
  rowsPerColumn: 10,
  startXRatio: 0.18,
  startYRatio: 0.15,
  columnGapRatio: 0.34,
  rowGapRatio: 0.07,
  optionGapRatio: 0.048,
  bubbleRadiusRatio: 0.014,
  markThreshold: 0.35,
  ambiguityThreshold: 0.07,
}

export function buildOMRTemplate(templateName: string, config: OMRTemplateConfig): OMRTemplate {
  return {
    ...config,
    options: OMR_OPTIONS.slice(0, config.choicesPerQuestion),
  }
}

export const DEFAULT_TEMPLATE_NAME = 'DEFAULT_TEMPLATE_20Q'
