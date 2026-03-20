import type { FastifyReply, FastifyRequest } from 'fastify'
import { uploadBodySchema } from '../schemas/uploads.schema.js'
import { UploadService } from '../services/upload.service.js'
import { saveMultipartFile } from '../utils/file-storage.js'
import { ok } from '../utils/http-response.js'

const uploadService = new UploadService()

export class UploadsController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const file = await request.file()

    if (!file) {
      return reply.status(400).send({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'Arquivo é obrigatório no upload.' },
      })
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

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return ok(reply, uploadService.listUploads())
  }
}
