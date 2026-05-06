import { z } from 'zod'

export const userRoleSchema = z.enum(['admin', 'editor', 'teacher', 'viewer'])

export const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  role: userRoleSchema.default('admin'),
})

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
})
