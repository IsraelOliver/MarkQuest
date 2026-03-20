import type { FastifyReply, FastifyRequest } from 'fastify'
import { processOMRSchema } from '../../schemas/omr.schema.js'
import { ok } from '../../utils/http-response.js'
import { OMRService } from './omr.service.js'

const omrService = new OMRService()

export class OMRController {
  async process(request: FastifyRequest, reply: FastifyReply) {
    const payload = processOMRSchema.parse(request.body)

    request.log.info({ examId: payload.examId, files: payload.uploadIds.length }, 'Starting OMR processing job')

    const result = await omrService.process(payload)

    return ok(
      reply,
      {
        id: result.job.id,
        status: result.job.status,
        templateId: result.job.templateId,
        answerKeyId: result.job.answerKeyId,
        files: result.files,
      },
      202,
      {
        totalFilesProcessed: result.files.length,
      },
    )
  }
}
