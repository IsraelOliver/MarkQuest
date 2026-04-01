import type { FastifyReply, FastifyRequest } from 'fastify'
import { answerKeyListQuerySchema, createAnswerKeySchema } from '../schemas/answer-keys.schema.js'
import { AnswerKeyService } from '../services/answer-key.service.js'
import { ok } from '../utils/http-response.js'

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
      return reply.status(404).send({
        success: false,
        error: { code: 'ANSWER_KEY_NOT_FOUND', message: 'Gabarito nao encontrado.' },
      })
    }

    return ok(reply, answerKey)
  }
}
