import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  UPLOAD_DIR: z.string().default('uploads'),
  DATA_FILE: z.string().default('data/markquest-db.json'),
  AUTH_TOKEN_SECRET: z.string().min(16).default('markquest-development-secret'),
  AUTH_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
})

export const env = envSchema.parse(process.env)
