import type { FastifyReply, FastifyRequest } from 'fastify'
import { answerKeyListQuerySchema, createAnswerKeySchema } from '../schemas/answer-keys.schema.js'
import { AnswerKeyService } from '../services/answer-key.service.js'
import { API_ERROR_CODES, ok, sendError } from '../utils/http-response.js'

const answerKeyService = new AnswerKeyService()

export class AnswerKeysController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const payload = createAnswerKeySchema.parse(request.body)
    return ok(reply, answerKeyService.create(payload), 201)
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = answerKeyListQuerySchema.parse(request.query)
    return ok(reply, answerKeyService.list(query))
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const answerKey = answerKeyService.findById(request.params.id)
    if (!answerKey) {
      return sendError(reply, 404, API_ERROR_CODES.NOT_FOUND, 'Gabarito não encontrado.', { cause: 'ANSWER_KEY_NOT_FOUND' })
    }

    return ok(reply, answerKey)
  }
}
