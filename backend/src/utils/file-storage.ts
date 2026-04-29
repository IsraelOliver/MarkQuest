import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { MultipartFile } from '@fastify/multipart'
import { env } from '../config/env.js'
import { ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES, INVALID_UPLOAD_MESSAGE, MAX_UPLOAD_FILE_SIZE_BYTES } from '../constants/uploads.js'
import { AppError } from './app-error.js'
import { generateId } from './id.js'

export async function saveMultipartFile(file: MultipartFile): Promise<{
  fileId: string
  storedName: string
  path: string
  size: number
}> {
  const uploadsDir = path.resolve(process.cwd(), env.UPLOAD_DIR)
  fs.mkdirSync(uploadsDir, { recursive: true })

  const extension = path.extname(file.filename).toLowerCase()
  const hasAllowedMimeType = ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])
  const hasAllowedExtension = ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])

  if (!file.file || !file.filename || !hasAllowedMimeType || !hasAllowedExtension) {
    throw new AppError('INVALID_UPLOAD_FILE', INVALID_UPLOAD_MESSAGE, 400)
  }

  const fileId = generateId('upload')
  const storedName = `${fileId}${extension}`
  const fullPath = path.join(uploadsDir, storedName)
  const tempPath = `${fullPath}.tmp`

  try {
    await pipeline(file.file, fs.createWriteStream(tempPath))
  } catch (error) {
    fs.rmSync(tempPath, { force: true })
    throw error
  }

  const stat = fs.statSync(tempPath)
  const streamState = file.file as NodeJS.ReadableStream & { truncated?: boolean }

  if (stat.size === 0 || stat.size > MAX_UPLOAD_FILE_SIZE_BYTES || streamState.truncated) {
    fs.rmSync(tempPath, { force: true })
    throw new AppError('UPLOAD_FILE_TOO_LARGE', INVALID_UPLOAD_MESSAGE, 413)
  }

  fs.renameSync(tempPath, fullPath)

  return {
    fileId,
    storedName,
    path: fullPath,
    size: stat.size,
  }
}
