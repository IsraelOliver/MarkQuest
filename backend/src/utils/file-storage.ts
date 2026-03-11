import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { MultipartFile } from '@fastify/multipart'
import { env } from '../config/env.js'
import { generateId } from './id.js'

export async function saveMultipartFile(file: MultipartFile): Promise<{
  fileId: string
  storedName: string
  path: string
  size: number
}> {
  const uploadsDir = path.resolve(process.cwd(), env.UPLOAD_DIR)
  fs.mkdirSync(uploadsDir, { recursive: true })

  const extension = path.extname(file.filename) || '.bin'
  const fileId = generateId('upload')
  const storedName = `${fileId}${extension}`
  const fullPath = path.join(uploadsDir, storedName)

  await pipeline(file.file, fs.createWriteStream(fullPath))
  const stat = fs.statSync(fullPath)

  return {
    fileId,
    storedName,
    path: fullPath,
    size: stat.size,
  }
}
