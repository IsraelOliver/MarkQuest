import { z } from 'zod'

export const createClassroomSchema = z.object({
  unitId: z.string().min(1),
  name: z.string().min(2),
  year: z.string().min(2),
})
