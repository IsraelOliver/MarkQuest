import { z } from 'zod'

const multipartFieldSchema = z.object({
  value: z.string().min(1),
})

export const uploadBodySchema = z.object({
  examId: multipartFieldSchema,
  studentId: multipartFieldSchema,
})
