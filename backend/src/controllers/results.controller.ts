import type { FastifyReply, FastifyRequest } from 'fastify'
import { resultsListQuerySchema } from '../schemas/results.schema.js'
import { ResultsService } from '../services/results.service.js'
import { API_ERROR_CODES, ok, sendError } from '../utils/http-response.js'

const resultsService = new ResultsService()

export class ResultsController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = resultsListQuerySchema.parse(request.query)
    return ok(reply, resultsService.listAll(query))
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const data = resultsService.getByJobId(request.params.id)

    if (!data) {
      return sendError(reply, 404, API_ERROR_CODES.NOT_FOUND, 'Resultado não encontrado para este job.')
    }

    return ok(reply, data)
  }

  async exportById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const csv = resultsService.exportByJobId(request.params.id)
    if (!csv) {
      return sendError(reply, 404, API_ERROR_CODES.NOT_FOUND, 'Resultado não encontrado para exportação.')
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="result-${request.params.id}.csv"`)
    return reply.send(csv)
  }
}
