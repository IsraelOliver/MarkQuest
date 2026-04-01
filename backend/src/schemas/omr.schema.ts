import { z } from 'zod'

export const processOMRSchema = z.object({
  examId: z.string().min(1),
  uploadIds: z.array(z.string().min(1)).min(1),
  templateId: z.string().min(1),
  answerKeyId: z.string().min(1),
})
