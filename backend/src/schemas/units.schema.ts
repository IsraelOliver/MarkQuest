import { z } from 'zod'

export const createUnitSchema = z.object({
  name: z.string().min(2),
  kind: z.enum(['school', 'course', 'other']).default('other'),
})
