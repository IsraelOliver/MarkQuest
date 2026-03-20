import { z } from 'zod'

export const createStudentSchema = z.object({
  classroomId: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().default(''),
  lastName: z.string().min(1),
  studentCode: z.string().min(1),
})
