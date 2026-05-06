import path from 'node:path'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES, INVALID_UPLOAD_MESSAGE } from '../constants/uploads.js'
import { uploadBodySchema, uploadListQuerySchema } from '../schemas/uploads.schema.js'
import { UploadService } from '../services/upload.service.js'
import { AppError } from '../utils/app-error.js'
import { saveMultipartFile } from '../utils/file-storage.js'
import { API_ERROR_CODES, ok, sendError } from '../utils/http-response.js'

const uploadService = new UploadService()

export class UploadsController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const file = await request.file()

    if (!file) {
      return sendError(reply, 400, API_ERROR_CODES.UPLOAD_INVALID, 'Arquivo é obrigatório no upload.', { cause: 'FILE_REQUIRED' })
    }

    const extension = path.extname(file.filename).toLowerCase()
    const hasAllowedMimeType = ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])
    const hasAllowedExtension = ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])

    if (!file.file || !file.filename || !hasAllowedMimeType || !hasAllowedExtension) {
      throw new AppError('INVALID_UPLOAD_FILE', INVALID_UPLOAD_MESSAGE, 400)
    }

    const parsed = uploadBodySchema.parse(file.fields)
    const saved = await saveMultipartFile(file)

    const upload = uploadService.createUpload({
      examId: parsed.examId.value,
      studentId: parsed.studentId.value,
      originalName: file.filename,
      storedName: saved.storedName,
      path: saved.path,
      mimeType: file.mimetype,
      size: saved.size,
    })

    return ok(reply, upload, 201)
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = uploadListQuerySchema.parse(request.query)
    return ok(reply, uploadService.listUploads(query))
  }
}
