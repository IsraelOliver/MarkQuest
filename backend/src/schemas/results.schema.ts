import { z } from 'zod'

export const resultsListQuerySchema = z.object({
  examId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
})
