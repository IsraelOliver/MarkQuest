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
        ...result.job,
        totalFiles: result.totalFiles,
        processedFiles: result.processedFiles,
        failedFiles: result.failedFiles,
        results: result.results,
      },
      202,
      {
        totalFilesProcessed: result.processedFiles,
      },
    )
  }
}
