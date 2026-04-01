import { z } from 'zod'
import { MAX_QUESTIONS } from '../constants/question-limits.js'

export const createExamSchema = z.object({
  classroomId: z.string().min(1),
  title: z.string().min(3),
  subject: z.string().min(2),
  totalQuestions: z.number().int().positive().max(MAX_QUESTIONS),
})
