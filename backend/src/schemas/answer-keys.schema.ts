import { z } from 'zod'

const bubbleOptionSchema = z.enum(['A', 'B', 'C', 'D', 'E'])
const answerKeyTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)

const answerKeyQuestionTypeSchema = z.enum(['objective', 'math', 'open', 'image', 'essay'])
const answerKeyQuestionKindSchema = z.enum(['ce', 'ad', 'ae', 'math', 'open', 'image', 'essay'])
const annulledScoringModeSchema = z.enum(['redistribute-group', 'redistribute-exam', 'grant-student'])

const answerKeyQuestionSchema = z.object({
  questionNumber: z.number().int().positive(),
  questionType: answerKeyQuestionTypeSchema,
  questionKind: answerKeyQuestionKindSchema,
  sourceSectionId: z.string().min(1),
  sourceSectionTitle: z.string().optional(),
  markerLabel: z.string().optional(),
  groupKey: z.string().min(1).optional(),
  groupLabel: z.string().min(1).optional(),
  validOptions: z.array(z.string().min(1)).default([]),
  correctAnswer: answerKeyTextSchema.nullable(),
  allowedCharacters: z.array(z.string().min(1).max(4)).optional(),
  responseColumns: z.number().int().positive().max(10).optional(),
  score: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  maxScore: z.number().nonnegative().optional(),
  status: z.enum(['active', 'annulled', 'manual']),
})

export const createAnswerKeySchema = z.object({
  name: z.string().min(2),
  examId: z.string().min(1),
  templateId: z.string().min(1),
  answers: z.array(bubbleOptionSchema.nullable()).min(1),
  questions: z.array(answerKeyQuestionSchema).optional(),
  defaultScore: z.number().nonnegative().optional(),
  defaultWeight: z.number().nonnegative().optional(),
  essayMaxScore: z.number().nonnegative().optional(),
  totalScore: z.number().nonnegative().optional(),
  annulledScoringMode: annulledScoringModeSchema.optional(),
})

export const updateAnswerKeySchema = createAnswerKeySchema

export const answerKeyListQuerySchema = z.object({
  examId: z.string().min(1).optional(),
  templateId: z.string().min(1).optional(),
})
