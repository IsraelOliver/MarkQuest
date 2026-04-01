import type { OMRTemplateConfig } from '../types/omr'
import { clampQuestionTotal } from './questionLimits'

export const DEFAULT_TEMPLATE_LAYOUT: OMRTemplateConfig = {
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

function clampPositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value) || value < 1) return fallback
  return Math.max(1, Math.round(value))
}

function clampRatio(value: number, fallback: number, min = 0, max = 1) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function getSuggestedRowsPerColumn(totalQuestions: number, columns: number) {
  const safeColumns = clampPositiveInteger(columns, DEFAULT_TEMPLATE_LAYOUT.columns)
  const safeTotalQuestions = clampQuestionTotal(totalQuestions)
  return Math.max(1, Math.ceil(safeTotalQuestions / safeColumns))
}

export function createTemplateLayoutConfig(
  totalQuestions: number,
  overrides: Partial<OMRTemplateConfig> = {},
): OMRTemplateConfig {
  const columns = clampPositiveInteger(overrides.columns ?? DEFAULT_TEMPLATE_LAYOUT.columns, DEFAULT_TEMPLATE_LAYOUT.columns)
  const normalizedTotalQuestions = clampQuestionTotal(totalQuestions)
  const safeChoicesPerQuestion =
    overrides.choicesPerQuestion === 2 ||
    overrides.choicesPerQuestion === 3 ||
    overrides.choicesPerQuestion === 4
      ? overrides.choicesPerQuestion
      : 5

  return {
    totalQuestions: normalizedTotalQuestions,
    choicesPerQuestion: safeChoicesPerQuestion,
    columns,
    rowsPerColumn: clampPositiveInteger(
      overrides.rowsPerColumn ?? getSuggestedRowsPerColumn(normalizedTotalQuestions, columns),
      getSuggestedRowsPerColumn(normalizedTotalQuestions, columns),
    ),
    startXRatio: clampRatio(overrides.startXRatio ?? DEFAULT_TEMPLATE_LAYOUT.startXRatio, DEFAULT_TEMPLATE_LAYOUT.startXRatio),
    startYRatio: clampRatio(overrides.startYRatio ?? DEFAULT_TEMPLATE_LAYOUT.startYRatio, DEFAULT_TEMPLATE_LAYOUT.startYRatio),
    columnGapRatio: clampRatio(
      overrides.columnGapRatio ?? DEFAULT_TEMPLATE_LAYOUT.columnGapRatio,
      DEFAULT_TEMPLATE_LAYOUT.columnGapRatio,
    ),
    rowGapRatio: clampRatio(overrides.rowGapRatio ?? DEFAULT_TEMPLATE_LAYOUT.rowGapRatio, DEFAULT_TEMPLATE_LAYOUT.rowGapRatio),
    optionGapRatio: clampRatio(
      overrides.optionGapRatio ?? DEFAULT_TEMPLATE_LAYOUT.optionGapRatio,
      DEFAULT_TEMPLATE_LAYOUT.optionGapRatio,
    ),
    bubbleRadiusRatio: clampRatio(
      overrides.bubbleRadiusRatio ?? DEFAULT_TEMPLATE_LAYOUT.bubbleRadiusRatio,
      DEFAULT_TEMPLATE_LAYOUT.bubbleRadiusRatio,
      0.001,
      0.2,
    ),
    markThreshold: clampRatio(
      overrides.markThreshold ?? DEFAULT_TEMPLATE_LAYOUT.markThreshold,
      DEFAULT_TEMPLATE_LAYOUT.markThreshold,
    ),
    ambiguityThreshold: clampRatio(
      overrides.ambiguityThreshold ?? DEFAULT_TEMPLATE_LAYOUT.ambiguityThreshold,
      DEFAULT_TEMPLATE_LAYOUT.ambiguityThreshold,
    ),
  }
}
