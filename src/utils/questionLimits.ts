import type { CardTemplateDefinition } from '../types/omr'

export const MAX_QUESTIONS = 300

export function clampQuestionTotal(value: number) {
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.min(MAX_QUESTIONS, Math.max(1, Math.round(value)))
}

export function getResolvedTotalQuestions(
  definition: Pick<CardTemplateDefinition, 'totalQuestions' | 'enableQuestionBlocks' | 'questionBlocks'>,
) {
  if (!definition.enableQuestionBlocks || !definition.questionBlocks.length) {
    return clampQuestionTotal(definition.totalQuestions)
  }

  const highestBlockEnd = definition.questionBlocks.reduce((maxEnd, block) => Math.max(maxEnd, block.endQuestion), 0)
  return clampQuestionTotal(highestBlockEnd || definition.totalQuestions)
}
