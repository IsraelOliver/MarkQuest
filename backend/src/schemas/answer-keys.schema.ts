import { z } from 'zod'

export const createAnswerKeySchema = z.object({
  name: z.string().min(2),
  examId: z.string().min(1),
  templateId: z.string().min(1),
  answers: z.array(z.enum(['A', 'B', 'C', 'D', 'E'])).min(1),
})
