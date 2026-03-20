import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  UPLOAD_DIR: z.string().default('uploads'),
  DATA_FILE: z.string().default('data/markquest-db.json'),
})

export const env = envSchema.parse(process.env)
