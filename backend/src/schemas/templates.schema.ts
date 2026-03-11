import { z } from 'zod'

const omrConfigSchema = z
  .object({
    columns: z.number().int().positive().optional(),
    rowsPerColumn: z.number().int().positive().optional(),
    startXRatio: z.number().min(0).max(1).optional(),
    startYRatio: z.number().min(0).max(1).optional(),
    columnGapRatio: z.number().min(0).max(1).optional(),
    rowGapRatio: z.number().min(0).max(1).optional(),
    optionGapRatio: z.number().min(0).max(1).optional(),
    bubbleRadiusRatio: z.number().min(0.001).max(0.2).optional(),
    markThreshold: z.number().min(0).max(1).optional(),
    ambiguityThreshold: z.number().min(0).max(1).optional(),
  })
  .optional()

export const createTemplateSchema = z.object({
  name: z.string().min(3),
  examId: z.string().min(1),
  totalQuestions: z.number().int().positive(),
  omrConfig: omrConfigSchema,
})
